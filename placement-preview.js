// Local-only preview based on an online snapshot. No ratings are sent to the server.
const placementPreview = typeof location !== 'undefined' && location.protocol === 'file:' ? {
  "revision": 900,
  "ratings": {
    "AlexG": {
      "elo": 1129,
      "legendary": false
    },
    "Andre": {
      "elo": 1283,
      "legendary": false
    },
    "Darius": {
      "elo": 1044,
      "legendary": false
    },
    "fabian": {
      "elo": 1239,
      "legendary": false
    },
    "Enil": {
      "elo": 1377,
      "legendary": true
    },
    "gabi": {
      "elo": 1038,
      "legendary": false
    },
    "Daniel": {
      "elo": 1343,
      "legendary": false
    },
    "Levi": {
      "elo": 1111,
      "legendary": false
    },
    "Samu": {
      "elo": 1209,
      "legendary": false
    },
    "Dejan": {
      "elo": 818,
      "legendary": false
    },
    "Jack": {
      "elo": 1025,
      "legendary": false
    },
    "Ali": {
      "elo": 1125,
      "legendary": false
    },
    "Omar": {
      "elo": 863,
      "legendary": false
    },
    "Baraa": {
      "elo": 815,
      "legendary": false
    },
    "Takunda": {
      "elo": 878,
      "legendary": false
    },
    "Danilo": {
      "elo": 1097,
      "legendary": false
    },
    "Andreeas": {
      "elo": 926,
      "legendary": false
    },
    "davideb": {
      "elo": 1076,
      "legendary": false
    },
    "Nikita": {
      "elo": 1207,
      "legendary": false
    },
    "Iacob": {
      "elo": 947,
      "legendary": false
    },
    "Damien": {
      "elo": 887,
      "legendary": false
    },
    "Valentin": {
      "elo": 905,
      "legendary": false
    },
    "Milan": {
      "elo": 831,
      "legendary": false
    },
    "Mohamed": {
      "elo": 1019,
      "legendary": false
    },
    "Paolo": {
      "elo": 749,
      "legendary": false
    },
    "Fabien": {
      "elo": 888,
      "legendary": false
    },
    "Lucas": {
      "elo": 1227,
      "legendary": false
    },
    "@~\u2744\ufe0f": {
      "elo": 810,
      "legendary": false
    },
    "Shahrom": {
      "elo": 973,
      "legendary": true
    },
    "Loay": {
      "elo": 1168,
      "legendary": false
    },
    "Hay": {
      "elo": 1093,
      "legendary": false
    }
  },
  "adjustments": {
    "Hay": -20,
    "Omar": -20,
    "Daniel": -20,
    "Paolo": -20,
    "Jack": -20,
    "Takunda": -20,
    "AlexG": -20,
    "Samu": -40,
    "Iacob": -40,
    "Levi": -40,
    "Nikita": -40,
    "Dejan": -40,
    "davideb": -40,
    "Andre": -40,
    "Ali": 40,
    "Loay": 40,
    "Andreeas": 40,
    "Danilo": 40,
    "Darius": 40,
    "Enil": 40,
    "Milan": 40,
    "Lucas": 20,
    "gabi": 20,
    "fabian": 20,
    "Mohamed": 20,
    "Baraa": 20,
    "Valentin": 20,
    "Fabien": 20
  }
} : null;
if (placementPreview) {
 placementPreview.ratings = structuredClone(placementPreview.ratings);
 for (const [name, delta] of Object.entries(placementPreview.adjustments)) {
  const rating = placementPreview.ratings[name];
  rating.elo += delta;
  rating.legendary ||= rating.elo >= 1350;
 }
}
