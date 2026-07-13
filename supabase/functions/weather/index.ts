import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeader = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeader
    });
  }

  
  try {
    const { city } = await req.json();
    if (!city) {
      return new Response(
        JSON.stringify({
          error: "City is required"
        }),
        {
          headers: { ...corsHeader, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    const api = Deno.env.get("OPENWEATHER_API_KEY");
 

    if (!api) {
      return new Response(
        JSON.stringify({
          error: "OPENWEATHER_API_KEY is required"
        }),
        {
          headers: { ...corsHeader, "Content-Type": "application/json" },
          status: 500
        }
      );
    }

    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api}&units=metric`);
    const result = await res.json();
    console.log(result);

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: result.message
        }),
        {
          headers: { ...corsHeader, "Content-Type": "application/json" },
          status: res.status
        }
      );
    }

    return new Response(
      JSON.stringify({
        city: result.name,
        country: result.sys.country,
        temperature: result.main.temp,
        humidity: result.main.humidity,
        pressure: result.main.pressure,
        feelsLike: result.main.feels_like,
        weather: result.weather[0].main,
        description: result.weather[0].description,
        windSpeed: result.wind.speed,
        icon: result.weather[0].icon,
      }),
      {
        headers: {
          ...corsHeader,
          "Content-Type": "application/json",
        },
      }
    );
  }
  catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeader, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});