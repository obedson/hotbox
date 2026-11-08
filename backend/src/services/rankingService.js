const db = require('../config/db');

// Calculate distance between two lat/lng points using Haversine formula
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Ranks hubs based on proximity, remaining capacity, rating, and postcode relevance.
 */
async function rankHubs({ userLat, userLng, targetPostcode = null, maxRadiusKm = 25 }) {
  const hasCoordinates = userLat != null && userLng != null;
  const result = await db.query(`
    SELECT 
      h.*,
      (h.capacity - h.current_load) AS available_slots,
      COALESCE(u.name, 'Host') as owner_name
    FROM hubs h
    LEFT JOIN users u ON h.owner_id = u.id
    WHERE h.status IN ('accredited', 'verified')
      AND h.is_accepting_parcels = TRUE
  `);

  const ranked = result.rows.map(hub => {
    const lat = parseFloat(hub.lat);
    const lng = parseFloat(hub.lng);
    const distanceKm = hasCoordinates
      ? calculateDistanceKm(userLat, userLng, lat, lng)
      : 0;

    const availableSlots = parseInt(hub.available_slots, 10);
    const rating = parseFloat(hub.rating) || 5.0;

    // Proximity score (higher is closer): 100 down to 0 at 25km
    const proximityScore = Math.max(0, 100 - (distanceKm * 4));

    // Capacity score: percentage of capacity available
    const capacityScore = hub.capacity > 0 ? (availableSlots / hub.capacity) * 100 : 0;

    // Rating score: (rating / 5) * 100
    const ratingScore = (rating / 5.0) * 100;

    // Postcode match bonus
    const postcodeBonus = (targetPostcode && hub.postcode === targetPostcode) ? 25 : 0;

    // Weighted composite score: 40% proximity, 30% capacity, 20% rating, + postcode bonus
    const compositeScore = Math.round(
      (proximityScore * 0.40) +
      (capacityScore * 0.30) +
      (ratingScore * 0.20) +
      postcodeBonus
    );

    return {
      ...hub,
      distanceKm,
      availableSlots,
      compositeScore,
      isFullyLoaded: availableSlots <= 0,
    };
  });

  // Filter within radius if coordinates were provided, then sort by composite score
  return ranked
    .filter(h => hasCoordinates ? h.distanceKm <= maxRadiusKm : true)
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

module.exports = {
  calculateDistanceKm,
  rankHubs,
};
