import aeFlag from '@admin/assets/images/flags/ae.svg';
import auFlag from '@admin/assets/images/flags/au.svg';
import brFlag from '@admin/assets/images/flags/br.svg';
import caFlag from '@admin/assets/images/flags/ca.svg';
import deFlag from '@admin/assets/images/flags/de.svg';
import frFlag from '@admin/assets/images/flags/fr.svg';
import gbFlag from '@admin/assets/images/flags/gb.svg';
import jpFlag from '@admin/assets/images/flags/jp.svg';
import sgFlag from '@admin/assets/images/flags/sg.svg';
import usFlag from '@admin/assets/images/flags/us.svg';
import small4 from '@admin/assets/images/stock/small-4.jpg';
import small5 from '@admin/assets/images/stock/small-5.jpg';
import small7 from '@admin/assets/images/stock/small-7.jpg';
export const weatherStatData = [{
  day: 'Today',
  temperature: '32°',
  status: 'Partly Cloudy',
  wind: '15km/h',
  humidity: '37%',
  icon: 'tabler:cloud-rain',
  className: 'bg-primary-subtle text-primary'
}, {
  day: 'Saturday',
  temperature: '30°',
  status: 'Cloudy',
  wind: '10km/h',
  humidity: '40%',
  icon: 'tabler:cloud',
  className: 'bg-warning-subtle text-warning'
}, {
  day: 'Sunday',
  temperature: '28°',
  status: 'Stormy',
  wind: '22km/h',
  humidity: '60%',
  icon: 'tabler:cloud-storm',
  className: 'bg-danger-subtle text-danger',
  image: small7,
  isActive: true
}, {
  day: 'Monday',
  temperature: '33°',
  status: 'Sunny',
  wind: '8km/h',
  humidity: '25%',
  icon: 'tabler:sun',
  className: 'bg-info-subtle text-info'
}, {
  day: 'Tuesday',
  temperature: '23°',
  status: 'Wind & Chill',
  wind: '20km/h',
  humidity: '45%',
  icon: 'tabler:snowflake',
  className: 'bg-success-subtle text-success'
}];
export const weatherData = [{
  className: 'text-bg-primary bg-gradient',
  current: {
    icon: 'tabler:cloud-rain',
    temperature: '32°',
    status: 'Partly cloudy',
    wind: '15km/h',
    humidity: '37%'
  },
  forecast: [{
    day: 'SAT',
    icon: 'tabler:cloud',
    temperature: '30°'
  }, {
    day: 'SUN',
    icon: 'tabler:cloud-storm',
    temperature: '28°'
  }, {
    day: 'MON',
    icon: 'tabler:sun-high',
    temperature: '33°'
  }, {
    day: 'TUE',
    icon: 'tabler:sun-high',
    temperature: '33°'
  }]
}, {
  className: 'text-bg-info bg-gradient',
  current: {
    icon: 'tabler:sun',
    temperature: '27°',
    status: 'Sunny',
    wind: '12km/h',
    humidity: '42%'
  },
  forecast: [{
    day: 'SAT',
    icon: 'tabler:cloud',
    temperature: '29°'
  }, {
    day: 'SUN',
    icon: 'tabler:rainbow',
    temperature: '26°'
  }, {
    day: 'MON',
    icon: 'tabler:cloud-fog',
    temperature: '24°'
  }, {
    day: 'TUE',
    icon: 'tabler:sun',
    temperature: '35°'
  }]
}];
export const topCityWeatherData = [{
  city: 'New York',
  status: 'Partly Cloudy',
  temperature: '28°C',
  humidity: '45%',
  wind: '12 km/h'
}, {
  city: 'London',
  status: 'Rainy',
  temperature: '19°C',
  humidity: '68%',
  wind: '20 km/h'
}, {
  city: 'Dubai',
  status: 'Sunny',
  temperature: '38°C',
  humidity: '20%',
  wind: '10 km/h'
}, {
  city: 'Tokyo',
  status: 'Thunderstorm',
  temperature: '25°C',
  humidity: '70%',
  wind: '18 km/h'
}, {
  city: 'Sydney',
  status: 'Windy',
  temperature: '22°C',
  humidity: '55%',
  wind: '30 km/h'
}, {
  city: 'Paris',
  status: 'Cloudy',
  temperature: '21°C',
  humidity: '50%',
  wind: '14 km/h'
}, {
  city: 'Toronto',
  status: 'Snowy',
  temperature: '-3°C',
  humidity: '72%',
  wind: '25 km/h'
}, {
  city: 'Singapore',
  status: 'Humid',
  temperature: '30°C',
  humidity: '80%',
  wind: '10 km/h'
}, {
  city: 'Berlin',
  status: 'Foggy',
  temperature: '16°C',
  humidity: '65%',
  wind: '8 km/h'
}, {
  city: 'Cape Town',
  status: 'Clear Sky',
  temperature: '26°C',
  humidity: '40%',
  wind: '12 km/h'
}];
export const countryWeatherData = [{
  country: {
    name: 'USA',
    image: usFlag
  },
  temperature: '28°C',
  feelsLike: '30°',
  humidity: '45%',
  wind: '12 km/h',
  status: 'Clear Sky',
  icon: 'sun',
  className: 'text-success'
}, {
  country: {
    name: 'UK',
    image: gbFlag
  },
  temperature: '19°C',
  feelsLike: '17°',
  humidity: '68%',
  wind: '20 km/h',
  status: 'Rainy',
  icon: 'cloud-rain',
  className: 'text-info'
}, {
  country: {
    name: 'UAE',
    image: aeFlag
  },
  temperature: '38°C',
  feelsLike: '41°',
  humidity: '20%',
  wind: '10 km/h',
  status: 'Sunny',
  icon: 'sun-high',
  className: 'text-warning'
}, {
  country: {
    name: 'Japan',
    image: jpFlag
  },
  temperature: '25°C',
  feelsLike: '26°',
  humidity: '70%',
  wind: '18 km/h',
  status: 'Stormy',
  icon: 'cloud-storm',
  className: 'text-danger'
}, {
  country: {
    name: 'Australia',
    image: auFlag
  },
  temperature: '22°C',
  feelsLike: '21°',
  humidity: '55%',
  wind: '30 km/h',
  status: 'Windy',
  icon: 'wind',
  className: 'text-primary'
}, {
  country: {
    name: 'Canada',
    image: caFlag
  },
  temperature: '14°C',
  feelsLike: '12°',
  humidity: '52%',
  wind: '15 km/h',
  status: 'Cloudy',
  icon: 'cloud',
  className: 'text-primary'
}, {
  country: {
    name: 'Germany',
    image: deFlag
  },
  temperature: '17°C',
  feelsLike: '16°',
  humidity: '60%',
  wind: '9 km/h',
  status: 'Drizzle',
  icon: 'cloud-drizzle',
  className: 'text-info'
}, {
  country: {
    name: 'France',
    image: frFlag
  },
  temperature: '21°C',
  feelsLike: '20°',
  humidity: '48%',
  wind: '14 km/h',
  status: 'Partly Sunny',
  icon: 'sun-wind',
  className: 'text-warning'
}, {
  country: {
    name: 'Brazil',
    image: brFlag
  },
  temperature: '30°C',
  feelsLike: '35°',
  humidity: '75%',
  wind: '22 km/h',
  status: 'Thunderstorm',
  icon: 'cloud-storm',
  className: 'text-danger'
}, {
  country: {
    name: 'Singapore',
    image: sgFlag
  },
  temperature: '32°C',
  feelsLike: '39°',
  humidity: '83%',
  wind: '11 km/h',
  status: 'Light Rain',
  icon: 'cloud-rain',
  className: 'text-success'
}];
export const hourlyWeatherData = [{
  time: 'Now',
  temperature: '72°',
  icon: 'tabler:cloud'
}, {
  time: '2pm',
  temperature: '74°',
  icon: 'tabler:cloud-bolt'
}, {
  time: '3pm',
  temperature: '76°',
  icon: 'tabler:sun-high'
}, {
  time: '4pm',
  temperature: '75°',
  icon: 'tabler:sun'
}, {
  time: '5pm',
  temperature: '71°',
  icon: 'tabler:cloud-rain'
}];
export const cityWeatherData = [{
  city: 'Berlin',
  temperature: '78°',
  status: 'Cloudy',
  image: small4,
  wind: {
    speed: '12 m/s',
    direction: 'NE'
  }
}, {
  city: 'Paris',
  temperature: '64°',
  status: 'Light Rain',
  image: small5,
  wind: {
    speed: '8 m/s',
    direction: 'SW'
  }
}];