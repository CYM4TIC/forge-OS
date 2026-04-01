// AppState removed — ProviderRegistry is now managed as
// Arc<tokio::sync::Mutex<ProviderRegistry>> directly in Tauri state.
// This eliminates the dual-registry bug (K-HIGH-001) where std::sync::Mutex
// in AppState and Arc<tokio::sync::Mutex> in lib.rs could diverge.
