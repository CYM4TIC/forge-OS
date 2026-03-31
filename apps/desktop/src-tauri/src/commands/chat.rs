use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::database::Database;
use crate::database::queries::{self, MessageRow};
use crate::providers::types::{CapabilityTier, ChatMessage, StreamChunk};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub session_id: String,
    pub content: String,
    pub provider_id: Option<String>,
    pub tier: Option<CapabilityTier>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StreamEvent {
    pub session_id: String,
    pub message_id: String,
    pub delta: String,
    pub model: Option<String>,
    pub tokens_in: Option<u64>,
    pub tokens_out: Option<u64>,
    pub done: bool,
}

#[tauri::command]
pub fn list_messages(db: State<'_, Database>, session_id: String) -> Result<Vec<MessageRow>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    queries::list_messages(&conn, &session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    db: State<'_, Database>,
    app_state: State<'_, AppState>,
    request: SendMessageRequest,
) -> Result<(), String> {
    let tier = request.tier.unwrap_or(CapabilityTier::Medium);

    // 1. Persist the user message to SQLite
    let user_msg_id = Uuid::new_v4().to_string();
    {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        queries::insert_message(
            &conn,
            &user_msg_id,
            &request.session_id,
            "user",
            &request.content,
            None,
            None,
            None,
            None,
        )
        .map_err(|e| e.to_string())?;
    }

    // 2. Load conversation history for context
    let messages: Vec<ChatMessage> = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let rows = queries::list_messages(&conn, &request.session_id)
            .map_err(|e| e.to_string())?;
        rows.into_iter()
            .map(|r| ChatMessage {
                role: r.role,
                content: r.content,
            })
            .collect()
    };

    // 3. Get the provider
    let provider = {
        let registry = app_state.providers.lock().map_err(|e| e.to_string())?;
        if let Some(pid) = &request.provider_id {
            registry.get(pid).cloned()
        } else {
            registry.get_default().cloned()
        }
    };

    let provider = provider.ok_or_else(|| "No provider configured".to_string())?;
    let provider_name = provider.name().to_string();

    // 4. Prepare the assistant message ID
    let assistant_msg_id = Uuid::new_v4().to_string();
    let session_id = request.session_id.clone();

    // 5. Stream the response
    if provider.supports_streaming() {
        let (tx, mut rx) = mpsc::channel::<StreamChunk>(64);

        let stream_session_id = session_id.clone();
        let stream_msg_id = assistant_msg_id.clone();
        let app_clone = app.clone();

        // Spawn the event emitter
        let emitter_handle = tokio::spawn(async move {
            let mut full_content = String::new();
            let mut final_model: Option<String> = None;
            let mut final_tokens_in: Option<u64> = None;
            let mut final_tokens_out: Option<u64> = None;

            while let Some(chunk) = rx.recv().await {
                full_content.push_str(&chunk.delta);
                if chunk.model.is_some() {
                    final_model = chunk.model.clone();
                }
                if chunk.tokens_in.is_some() {
                    final_tokens_in = chunk.tokens_in;
                }
                if chunk.tokens_out.is_some() {
                    final_tokens_out = chunk.tokens_out;
                }

                let event = StreamEvent {
                    session_id: stream_session_id.clone(),
                    message_id: stream_msg_id.clone(),
                    delta: chunk.delta,
                    model: final_model.clone(),
                    tokens_in: chunk.tokens_in,
                    tokens_out: chunk.tokens_out,
                    done: chunk.done,
                };

                let _ = app_clone.emit("chat:stream", &event);
            }

            (full_content, final_model, final_tokens_in, final_tokens_out)
        });

        // Run the provider stream
        provider
            .stream_message(messages, tier, tx)
            .await
            .map_err(|e| e.to_string())?;

        // Wait for the emitter to finish collecting
        let (full_content, final_model, tokens_in, tokens_out) = emitter_handle
            .await
            .map_err(|e| e.to_string())?;

        // 6. Persist the assistant message
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        queries::insert_message(
            &conn,
            &assistant_msg_id,
            &session_id,
            "assistant",
            &full_content,
            final_model.as_deref(),
            Some(&provider_name),
            tokens_in.map(|t| t as i64),
            tokens_out.map(|t| t as i64),
        )
        .map_err(|e| e.to_string())?;
    } else {
        // Non-streaming fallback
        let response = provider
            .send_message(messages, tier)
            .await
            .map_err(|e| e.to_string())?;

        // Emit as a single complete event
        let event = StreamEvent {
            session_id: session_id.clone(),
            message_id: assistant_msg_id.clone(),
            delta: response.content.clone(),
            model: Some(response.model.clone()),
            tokens_in: response.tokens_in,
            tokens_out: response.tokens_out,
            done: true,
        };
        let _ = app.emit("chat:stream", &event);

        // Persist
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        queries::insert_message(
            &conn,
            &assistant_msg_id,
            &session_id,
            "assistant",
            &response.content,
            Some(&response.model),
            Some(&provider_name),
            response.tokens_in.map(|t| t as i64),
            response.tokens_out.map(|t| t as i64),
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
