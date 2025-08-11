/**
 * Dropbox Formatter
 * Formats Whoop data into markdown notes for Dropbox storage
 */

class DropboxFormatter {
  constructor(options = {}) {
    this.dateFormat = options.dateFormat || 'YYYY-MM-DD';
  }

  /**
   * Format milliseconds to human-readable duration
   */
  formatDuration(milliseconds) {
    if (!milliseconds || isNaN(milliseconds)) return '0h 0m';
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  /**
   * Format percentage value
   */
  formatPercentage(value) {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `${Math.round(value)}%`;
  }

  /**
   * Format number with specified decimals
   */
  formatNumber(value, decimals = 1) {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return value.toFixed(decimals);
  }

  /**
   * Get sleep records for a specific date
   */
  getSleepForDate(sleepRecords, date) {
    // Find sleep that ended on this date (main sleep)
    const mainSleep = sleepRecords.find(s => {
      const sleepEnd = new Date(s.end);
      return sleepEnd.toDateString() === date.toDateString() && !s.nap;
    });

    // Find any naps on this date
    const naps = sleepRecords.filter(s => {
      const sleepEnd = new Date(s.end);
      return sleepEnd.toDateString() === date.toDateString() && s.nap;
    });

    return { mainSleep, naps };
  }

  /**
   * Get recovery record for a specific date
   */
  getRecoveryForDate(recoveryRecords, date) {
    return recoveryRecords.find(r => {
      const recoveryDate = new Date(r.created_at);
      return recoveryDate.toDateString() === date.toDateString();
    });
  }

  /**
   * Get cycle record for a specific date
   */
  getCycleForDate(cycles, date) {
    return cycles.find(c => {
      const cycleStart = new Date(c.start);
      return cycleStart.toDateString() === date.toDateString();
    });
  }

  /**
   * Get workouts for a specific date
   */
  getWorkoutsForDate(workouts, date) {
    return workouts.filter(w => {
      const workoutStart = new Date(w.start);
      return workoutStart.toDateString() === date.toDateString();
    });
  }

  /**
   * Format sleep stages section
   */
  formatSleepStages(stageSummary) {
    if (!stageSummary) return '';
    
    const totalTime = stageSummary.total_in_bed_time_milli || 1; // Avoid division by zero
    
    return `### Sleep Stages
- **REM Sleep**: ${this.formatDuration(stageSummary.total_rem_sleep_time_milli)} (${this.formatPercentage((stageSummary.total_rem_sleep_time_milli / totalTime) * 100)})
- **Deep Sleep**: ${this.formatDuration(stageSummary.total_slow_wave_sleep_time_milli)} (${this.formatPercentage((stageSummary.total_slow_wave_sleep_time_milli / totalTime) * 100)})
- **Light Sleep**: ${this.formatDuration(stageSummary.total_light_sleep_time_milli)} (${this.formatPercentage((stageSummary.total_light_sleep_time_milli / totalTime) * 100)})
- **Awake Time**: ${this.formatDuration(stageSummary.total_awake_time_milli)} (${this.formatPercentage((stageSummary.total_awake_time_milli / totalTime) * 100)})
- **Sleep Cycles**: ${stageSummary.sleep_cycle_count || 0}
- **Disturbances**: ${stageSummary.disturbance_count || 0}`;
  }

  /**
   * Format sleep need section
   */
  formatSleepNeed(sleepNeeded) {
    if (!sleepNeeded) return '';
    
    return `### Sleep Need
- **Baseline Need**: ${this.formatDuration(sleepNeeded.baseline_milli)}
- **Sleep Debt**: ${this.formatDuration(sleepNeeded.need_from_sleep_debt_milli)}
- **Recent Strain**: ${this.formatDuration(sleepNeeded.need_from_recent_strain_milli)}
- **Nap Credit**: ${this.formatDuration(Math.abs(sleepNeeded.need_from_recent_nap_milli || 0))}`;
  }

  /**
   * Format workout details
   */
  formatWorkout(workout) {
    const startTime = new Date(workout.start).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const duration = this.formatDuration(
      new Date(workout.end) - new Date(workout.start)
    );
    
    let details = `### ${workout.score?.sport_name || 'Workout'} - ${startTime}
- **Duration**: ${duration}
- **Strain**: ${this.formatNumber(workout.score?.strain || 0, 1)}
- **Average HR**: ${workout.score?.average_heart_rate || 'N/A'} bpm
- **Max HR**: ${workout.score?.max_heart_rate || 'N/A'} bpm
- **Calories**: ${this.formatNumber((workout.score?.kilojoule || 0) * 0.239006, 0)} cal`;

    // Add distance if available
    if (workout.score?.distance_meter) {
      const miles = (workout.score.distance_meter / 1609.34).toFixed(2);
      details += `\n- **Distance**: ${miles} miles`;
    }

    // Add altitude if available
    if (workout.score?.altitude_gain_meter) {
      const feet = (workout.score.altitude_gain_meter * 3.28084).toFixed(0);
      details += `\n- **Elevation Gain**: ${feet} ft`;
    }

    // Add heart rate zones if available
    if (workout.score?.zone_duration) {
      const zones = workout.score.zone_duration;
      details += `\n\n#### Heart Rate Zones`;
      if (zones.zone_zero_milli) {
        details += `\n- **Zone 0 (Rest)**: ${this.formatDuration(zones.zone_zero_milli)}`;
      }
      if (zones.zone_one_milli) {
        details += `\n- **Zone 1 (Light)**: ${this.formatDuration(zones.zone_one_milli)}`;
      }
      if (zones.zone_two_milli) {
        details += `\n- **Zone 2 (Moderate)**: ${this.formatDuration(zones.zone_two_milli)}`;
      }
      if (zones.zone_three_milli) {
        details += `\n- **Zone 3 (Hard)**: ${this.formatDuration(zones.zone_three_milli)}`;
      }
      if (zones.zone_four_milli) {
        details += `\n- **Zone 4 (Very Hard)**: ${this.formatDuration(zones.zone_four_milli)}`;
      }
      if (zones.zone_five_milli) {
        details += `\n- **Zone 5 (Max)**: ${this.formatDuration(zones.zone_five_milli)}`;
      }
    }

    return details;
  }

  /**
   * Create a daily note from Whoop data
   */
  createDailyNote(date, data) {
    const dateStr = date.toISOString().split('T')[0];
    const { mainSleep, naps } = this.getSleepForDate(data.sleep, date);
    const recovery = this.getRecoveryForDate(data.recovery, date);
    const cycle = this.getCycleForDate(data.cycles, date);
    const workouts = this.getWorkoutsForDate(data.workouts, date);

    // Build frontmatter
    const frontmatter = {
      date: dateStr,
      tags: ['whoop', 'fitness', 'health'],
      recovery_score: recovery?.score?.recovery_score || null,
      hrv: recovery?.score?.hrv_rmssd_milli || null,
      rhr: recovery?.score?.resting_heart_rate || null,
      sleep_performance: mainSleep?.score?.sleep_performance_percentage || null,
      strain: cycle?.score?.strain || null,
      calories: cycle?.score?.kilojoule ? Math.round(cycle.score.kilojoule * 0.239006) : null,
      workouts_count: workouts.length
    };

    let content = `---\n`;
    Object.entries(frontmatter).forEach(([key, value]) => {
      if (key === 'tags') {
        content += `${key}: [${value.join(', ')}]\n`;
      } else {
        content += `${key}: ${value !== null ? value : 'N/A'}\n`;
      }
    });
    content += `---\n\n`;

    content += `# ${dateStr} - Whoop Summary\n\n`;

    // Recovery Section
    content += `## 🔄 Recovery\n`;
    if (recovery?.score) {
      const score = recovery.score;
      const emoji = score.recovery_score >= 67 ? '🟢' : 
                    score.recovery_score >= 34 ? '🟡' : '🔴';
      content += `- **Recovery Score**: ${emoji} ${this.formatNumber(score.recovery_score, 0)}%\n`;
      content += `- **HRV**: ${this.formatNumber(score.hrv_rmssd_milli, 1)} ms\n`;
      content += `- **Resting Heart Rate**: ${this.formatNumber(score.resting_heart_rate, 0)} bpm\n`;
      
      if (score.skin_temp_celsius !== undefined) {
        content += `- **Skin Temp**: ${this.formatNumber(score.skin_temp_celsius, 1)}°C\n`;
      }
      if (score.spo2_percentage !== undefined) {
        content += `- **SpO2**: ${this.formatNumber(score.spo2_percentage, 1)}%\n`;
      }
    } else {
      content += `*No recovery data available*\n`;
    }
    content += `\n`;

    // Sleep Section
    content += `## 😴 Sleep\n`;
    if (mainSleep?.score) {
      const score = mainSleep.score;
      const duration = score.stage_summary ? 
        score.stage_summary.total_in_bed_time_milli - score.stage_summary.total_awake_time_milli : 0;
      
      content += `- **Performance**: ${this.formatPercentage(score.sleep_performance_percentage)}\n`;
      if (score.stage_summary) {
        content += `- **Time in Bed**: ${this.formatDuration(score.stage_summary.total_in_bed_time_milli)}\n`;
        content += `- **Time Asleep**: ${this.formatDuration(duration)}\n`;
      }
      content += `- **Efficiency**: ${this.formatPercentage(score.sleep_efficiency_percentage)}\n`;
      content += `- **Consistency**: ${this.formatPercentage(score.sleep_consistency_percentage)}\n`;
      content += `- **Respiratory Rate**: ${this.formatNumber(score.respiratory_rate, 1)} brpm\n`;
      
      if (score.stage_summary) {
        content += `\n${this.formatSleepStages(score.stage_summary)}\n`;
      }
      if (score.sleep_needed) {
        content += `\n${this.formatSleepNeed(score.sleep_needed)}\n`;
      }
    } else {
      content += `*No sleep data available*\n`;
    }

    // Naps Section
    if (naps.length > 0) {
      content += `\n### 💤 Naps\n`;
      naps.forEach((nap, index) => {
        const napDuration = nap.score?.stage_summary?.total_in_bed_time_milli || 0;
        const napStart = new Date(nap.start).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        content += `- **Nap ${index + 1}** (${napStart}): ${this.formatDuration(napDuration)}, Performance: ${this.formatPercentage(nap.score?.sleep_performance_percentage)}\n`;
      });
    }
    content += `\n`;

    // Strain Section
    content += `## 💪 Strain & Activity\n`;
    if (cycle?.score) {
      const score = cycle.score;
      const strainEmoji = score.strain >= 18 ? '🔴' : 
                          score.strain >= 14 ? '🟠' : 
                          score.strain >= 10 ? '🟡' : '🟢';
      content += `- **Day Strain**: ${strainEmoji} ${this.formatNumber(score.strain, 1)}\n`;
      content += `- **Average HR**: ${score.average_heart_rate || 'N/A'} bpm\n`;
      content += `- **Max HR**: ${score.max_heart_rate || 'N/A'} bpm\n`;
      content += `- **Calories**: ${this.formatNumber(score.kilojoule * 0.239006, 0)} cal\n`;
    } else {
      content += `*No strain data available*\n`;
    }
    content += `\n`;

    // Workouts Section
    if (workouts.length > 0) {
      content += `## 🏃 Workouts\n`;
      workouts.forEach(workout => {
        content += this.formatWorkout(workout) + '\n\n';
      });
    }

    // Body Measurements (if recent)
    const recentBodyMeasurement = data.bodyMeasurements[0];
    if (recentBodyMeasurement) {
      const measurementDate = new Date(recentBodyMeasurement.created_at);
      const daysDiff = Math.floor((date - measurementDate) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) {
        content += `## 📊 Body Measurements\n`;
        content += `*Updated ${daysDiff === 0 ? 'today' : `${daysDiff} days ago`}*\n`;
        if (recentBodyMeasurement.height_meter) {
          const feet = Math.floor(recentBodyMeasurement.height_meter * 3.28084);
          const inches = Math.round(((recentBodyMeasurement.height_meter * 3.28084) % 1) * 12);
          content += `- **Height**: ${feet}'${inches}"\n`;
        }
        if (recentBodyMeasurement.weight_kilogram) {
          const pounds = (recentBodyMeasurement.weight_kilogram * 2.20462).toFixed(1);
          content += `- **Weight**: ${pounds} lbs\n`;
        }
        if (recentBodyMeasurement.max_heart_rate) {
          content += `- **Max HR**: ${recentBodyMeasurement.max_heart_rate} bpm\n`;
        }
        content += `\n`;
      }
    }

    // Notes Section
    content += `## 📝 Notes\n`;
    content += `*Add your daily notes here*\n\n`;

    // Footer
    content += `---\n`;
    content += `*Synced via [Whoop to Dropbox Sync](https://github.com/MajorAaron/whoop-dropbox-sync-action) on ${new Date().toISOString()}*\n`;

    return content;
  }

  /**
   * Create a README for the Whoop directory
   */
  createReadme(lastSyncDate, stats) {
    return `# Whoop Data Sync

This folder contains your daily Whoop fitness data synced automatically via GitHub Actions.

## 📊 Sync Statistics

- **Last Sync**: ${lastSyncDate.toISOString()}
- **Sleep Records**: ${stats.sleepRecords || 0}
- **Recovery Records**: ${stats.recoveryRecords || 0}
- **Workout Records**: ${stats.workoutRecords || 0}
- **Notes Created**: ${stats.notesCreated || 0}

## 📁 Structure

\`\`\`
WHOOP/
├── Daily/           # Daily notes organized by year and month
│   └── YYYY/
│       └── MM-Month/
│           └── YYYY-MM-DD.md
└── README.md        # This file
\`\`\`

## 🔄 Sync Schedule

- **Automatic**: Daily via GitHub Actions
- **Manual**: Trigger via GitHub Actions workflow dispatch

## 📈 Data Included

### Recovery Metrics
- Recovery score with color indicators (🟢🟡🔴)
- Heart Rate Variability (HRV)
- Resting Heart Rate
- Skin Temperature
- Blood Oxygen (SpO2)

### Sleep Analysis
- Sleep performance and efficiency
- Sleep stages (REM, Deep, Light, Awake)
- Sleep need and debt calculations
- Respiratory rate
- Nap tracking

### Activity & Strain
- Daily strain score
- Workout details and heart rate zones
- Calorie burn
- Distance and elevation (when applicable)

### Body Measurements
- Height, weight, and max heart rate
- Updated when changed in Whoop app

---
*Powered by [Whoop to Dropbox Sync Action](https://github.com/MajorAaron/whoop-dropbox-sync-action)*
`;
  }
}

module.exports = DropboxFormatter;