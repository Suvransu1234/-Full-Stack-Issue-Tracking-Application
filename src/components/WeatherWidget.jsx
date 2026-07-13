import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function WeatherWidget() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);

  const getWeather = async () => {
    if (!city.trim()) return;
    
    const { data, error } = await supabase.functions.invoke(
      "weather",
      {
        body: {
          city,
        },
      }
    );

    if (error) {
      alert(error.message);
      return;
    }

    setWeather(data);
  };

  return (
    <div className="weather-widget widget-panel">
      <h1 className="title">Weather</h1>

      <div className="search-box">
        <input
          className="search-input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city..."
          onKeyDown={(e) => e.key === 'Enter' && getWeather()}
        />
        <button className="search-btn" onClick={getWeather}>
          Search
        </button>
      </div>

      {weather && (
        <div className="weather-info">
          <div className="weather-header">
            <h2 className="city-name">
              {weather.city}, {weather.country}
            </h2>
            <img
              className="weather-icon"
              src={`https://openweathermap.org/img/wn/${weather.icon}@4x.png`}
              alt={weather.weather}
              style={{ width: "80px", height: "80px" }}
            />
            <div className="temp">{weather.temperature.toFixed(1)}°C</div>
            <div className="desc">{weather.description}</div>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Humidity</span>
              <span className="detail-value">{weather.humidity}%</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Wind</span>
              <span className="detail-value">{weather.windSpeed} m/s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
