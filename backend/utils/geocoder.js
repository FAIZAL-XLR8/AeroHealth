const BENGALURU_CENTER = [77.641151, 12.971891];

const BENGALURU_BBOX = "77.30,12.75,77.90,13.20";

const geocodeAddress = async (address) => {
  if (!address || !process.env.MAPBOX_ACCESS_TOKEN) {
    return BENGALURU_CENTER;
  }

  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json` +
      `?limit=1` +
      `&country=in` +
      `&bbox=${BENGALURU_BBOX}` +
      `&access_token=${process.env.MAPBOX_ACCESS_TOKEN}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const coordinates = feature.geometry.coordinates;


      return coordinates;
    }


    return BENGALURU_CENTER;
  } catch (err) {


    return BENGALURU_CENTER;
  }
};

module.exports = {
  geocodeAddress,
  BENGALURU_CENTER,
};