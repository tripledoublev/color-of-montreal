import { getSleepInterval } from './timing.js';
import suncalc from 'suncalc';
import config from '../config/index.js';

// Function to format time in local timezone
const formatLocalTime = (date) => {
  return date.toLocaleString('en-US', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Function to format duration in minutes
const formatDuration = (ms) => {
  const minutes = Math.round(ms / (60 * 1000));
  return `${minutes} minutes`;
};

// Function to get solar times for a given date
const getSolarTimes = (date) => {
  const times = suncalc.getTimes(date, config.coordinates.lat, config.coordinates.lon);
  return {
    dawn: times.dawn,
    sunriseEnd: times.sunriseEnd,
    sunsetStart: times.sunsetStart,
    dusk: times.dusk
  };
};

// Function to get period name for a given time
const getPeriodName = (date, solarTimes) => {
  const nightStart = new Date(solarTimes.dusk.getTime() + 5 * 60 * 1000);
  const nightEnd = new Date(solarTimes.dawn.getTime() - 5 * 60 * 1000);

  if (date >= nightStart || date < nightEnd) {
    return "🌙 Night Pause";
  } else if (date >= solarTimes.dawn && date < solarTimes.sunriseEnd) {
    return "🌅 Dawn to Sunrise";
  } else if (date >= solarTimes.sunriseEnd && date < solarTimes.sunsetStart - 30 * 60 * 1000) {
    return "☀️ Daytime";
  } else if (date >= solarTimes.sunsetStart - 30 * 60 * 1000 && date < nightStart) {
    return "🌇 Sunset Period";
  }
  return "🌅 Dawn to Sunrise"; // Default to dawn period for any edge cases
};

// Main test function
const testTimingSchedule = () => {
  const now = new Date();
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  console.log("\n=== 24-Hour Posting Schedule Simulation ===");
  console.log(`Current time: ${formatLocalTime(now)}`);
  console.log("Local timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log("\nSchedule:");

  let currentTime = now;
  let lastPeriod = null;
  let postCount = 0;
  let daytimePostCount = 0;

  while (currentTime < endTime) {
    const solarTimes = getSolarTimes(currentTime);
    const period = getPeriodName(currentTime, solarTimes);
    const sleepInterval = getSleepInterval(currentTime);
    
    // Only log if it's a new period or if we're posting
    if (period !== lastPeriod || period !== "🌙 Night Pause") {
      console.log(`\n${formatLocalTime(currentTime)} - ${period}`);
      
      if (period === "🌙 Night Pause") {
        const nextTime = new Date(currentTime.getTime() + sleepInterval);
        console.log(`Next post at: ${formatLocalTime(nextTime)}`);
      } else {
        console.log(`Next post in: ${formatDuration(sleepInterval)}`);
        postCount++;
        if (period === "☀️ Daytime") daytimePostCount++;
      }
      
      lastPeriod = period;
    }

    // Move to next time
    currentTime = new Date(currentTime.getTime() + sleepInterval);
  }

  console.log("\n=== End of Schedule ===");
  console.log(`Total posts in 24 hours: ${postCount}`);
  console.log(`Daytime posts: ${daytimePostCount} (random intervals between 56 and 72 minutes)`);
  console.log(`Dawn/Sunset posts: ${postCount - daytimePostCount} (every 9 minutes)`);
};

// Run the test
testTimingSchedule(); 