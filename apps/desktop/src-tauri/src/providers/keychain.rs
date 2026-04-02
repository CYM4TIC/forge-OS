/// OS keychain integration for secure API key storage.
/// Uses the platform's native credential store:
/// - Windows: Credential Manager
/// - macOS: Keychain
/// - Linux: SecretService (via D-Bus)
///
/// Fixes TANAKA-HIGH-1: API keys were stored as plaintext in SQLite settings.

const SERVICE_NAME: &str = "forge-os";

/// Store an API key in the OS keychain.
pub fn store_api_key(provider_id: &str, api_key: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|e| format!("Keychain entry error for '{}': {}", provider_id, e))?;
    entry
        .set_password(api_key)
        .map_err(|e| format!("Failed to store key for '{}': {}", provider_id, e))
}

/// Retrieve an API key from the OS keychain.
pub fn get_api_key(provider_id: &str) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|e| format!("Keychain entry error for '{}': {}", provider_id, e))?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to retrieve key for '{}': {}", provider_id, e)),
    }
}

/// Delete an API key from the OS keychain.
#[allow(dead_code)]
pub fn delete_api_key(provider_id: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider_id)
        .map_err(|e| format!("Keychain entry error for '{}': {}", provider_id, e))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already gone
        Err(e) => Err(format!("Failed to delete key for '{}': {}", provider_id, e)),
    }
}
