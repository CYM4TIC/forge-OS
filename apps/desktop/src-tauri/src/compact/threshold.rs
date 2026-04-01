use serde::{Deserialize, Serialize};

/// Context usage zones for UI display.
/// Maps to color coding: green → yellow → red.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UsageZone {
    /// 0-60%: Plenty of room. Green.
    Comfortable,
    /// 60-80%: Getting warm. Yellow.
    Warning,
    /// 80-85%: About to trigger. Orange.
    Critical,
    /// 85%+: Auto-compact should trigger. Red.
    Compacting,
}

impl std::fmt::Display for UsageZone {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Comfortable => write!(f, "comfortable"),
            Self::Warning => write!(f, "warning"),
            Self::Critical => write!(f, "critical"),
            Self::Compacting => write!(f, "compacting"),
        }
    }
}

/// Determine the usage zone from a fraction (0.0 - 1.0).
pub fn usage_zone(fraction: f64) -> UsageZone {
    if fraction >= 0.85 {
        UsageZone::Compacting
    } else if fraction >= 0.80 {
        UsageZone::Critical
    } else if fraction >= 0.60 {
        UsageZone::Warning
    } else {
        UsageZone::Comfortable
    }
}

/// Full threshold status for UI and decision-making.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThresholdStatus {
    /// Current token count (approximate).
    pub current_tokens: usize,
    /// Total context window size.
    pub context_window_size: usize,
    /// Usage as fraction (0.0 - 1.0).
    pub usage_fraction: f64,
    /// Whether auto-compact should trigger now.
    pub should_compact: bool,
    /// The threshold fraction (0.85).
    pub threshold: f64,
    /// Color-coded zone for UI.
    pub zone: UsageZone,
}

impl ThresholdStatus {
    /// Remaining tokens before threshold is hit.
    pub fn tokens_remaining(&self) -> usize {
        let threshold_tokens = (self.context_window_size as f64 * self.threshold) as usize;
        if self.current_tokens >= threshold_tokens {
            0
        } else {
            threshold_tokens - self.current_tokens
        }
    }

    /// Usage as a percentage (0 - 100).
    pub fn usage_percent(&self) -> f64 {
        self.usage_fraction * 100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_usage_zones() {
        assert_eq!(usage_zone(0.0), UsageZone::Comfortable);
        assert_eq!(usage_zone(0.50), UsageZone::Comfortable);
        assert_eq!(usage_zone(0.60), UsageZone::Warning);
        assert_eq!(usage_zone(0.75), UsageZone::Warning);
        assert_eq!(usage_zone(0.80), UsageZone::Critical);
        assert_eq!(usage_zone(0.84), UsageZone::Critical);
        assert_eq!(usage_zone(0.85), UsageZone::Compacting);
        assert_eq!(usage_zone(0.95), UsageZone::Compacting);
    }

    #[test]
    fn test_tokens_remaining() {
        let status = ThresholdStatus {
            current_tokens: 100_000,
            context_window_size: 200_000,
            usage_fraction: 0.50,
            should_compact: false,
            threshold: 0.85,
            zone: UsageZone::Comfortable,
        };
        // Threshold at 170K, current 100K → 70K remaining
        assert_eq!(status.tokens_remaining(), 70_000);
    }

    #[test]
    fn test_tokens_remaining_at_threshold() {
        let status = ThresholdStatus {
            current_tokens: 180_000,
            context_window_size: 200_000,
            usage_fraction: 0.90,
            should_compact: true,
            threshold: 0.85,
            zone: UsageZone::Compacting,
        };
        assert_eq!(status.tokens_remaining(), 0);
    }
}
