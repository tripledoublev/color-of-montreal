import suncalc from 'suncalc';
import config from '../config/index.js';

// Keep track of last daytime interval to alternate
let lastDayInterval = 56;

const getSleepInterval = (currentDate) => {
  const times = suncalc.getTimes(currentDate, config.coordinates.lat, config.coordinates.lon);
  const nightStart = new Date(times.dusk.getTime() + 5 * 60 * 1000);
  const nightEnd = new Date(times.dawn.getTime() - 5 * 60 * 1000);
  
  // During night pause, sleep until dawn
  if (currentDate >= nightStart) {
    // If we're past dusk, calculate time until next dawn
    const tomorrowTimes = suncalc.getTimes(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000), config.coordinates.lat, config.coordinates.lon);
    const nextDawn = new Date(tomorrowTimes.dawn.getTime() - 5 * 60 * 1000);
    console.log("Night pause - sleeping until next dawn");
    return nextDawn.getTime() - currentDate.getTime();
  } else if (currentDate < nightEnd) {
    // If we're before dawn, calculate time until dawn
    console.log("Night pause - sleeping until dawn");
    return nightEnd.getTime() - currentDate.getTime();
  } else if (currentDate >= times.dawn && currentDate < times.sunriseEnd) {
    // Dawn to sunrise - post every 9 minutes
    console.log("Dawn to sunrise period - posting every 9 minutes");
    return 9 * 60 * 1000;
  } else if (currentDate >= times.sunriseEnd && currentDate < times.sunsetStart - 30 * 60 * 1000) {
    // Daytime - random interval between 56 and 72 minutes
    const randomInterval = Math.floor(Math.random() * (72 - 56 + 1)) + 56;
    console.log(`Daytime period - posting every ${randomInterval} minutes`);
    return randomInterval * 60 * 1000;
  } else if (currentDate >= times.sunsetStart - 30 * 60 * 1000 && currentDate < nightStart) {
    // Sunset period - post every 9 minutes
    console.log("Sunset period - posting every 9 minutes");
    return 9 * 60 * 1000;
  }

  // If we somehow get here, treat it as dawn period
  console.log("Dawn period - posting every 9 minutes");
  return 9 * 60 * 1000;
};

export {
  getSleepInterval
}; 