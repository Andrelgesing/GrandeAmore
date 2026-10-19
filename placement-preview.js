// Local preview from an online backup. Existing scores already include 11 October.
const placementPreview = typeof location !== 'undefined' && location.protocol === 'file:' ? {
  "date": "2026-10-18",
  "revision": 1517,
  "ratings": {
    "AlexG": {
      "elo": 1095,
      "legendary": false
    },
    "Andre": {
      "elo": 1267,
      "legendary": false
    },
    "Darius": {
      "elo": 1011,
      "legendary": false
    },
    "fabian": {
      "elo": 1250,
      "legendary": false
    },
    "Enil": {
      "elo": 1430,
      "legendary": true
    },
    "gabi": {
      "elo": 1094,
      "legendary": false
    },
    "Daniel": {
      "elo": 1365,
      "legendary": true
    },
    "Levi": {
      "elo": 1051,
      "legendary": false
    },
    "Samu": {
      "elo": 1177,
      "legendary": false
    },
    "Dejan": {
      "elo": 746,
      "legendary": false
    },
    "Jack": {
      "elo": 1042,
      "legendary": false
    },
    "Ali": {
      "elo": 1123,
      "legendary": false
    },
    "Omar": {
      "elo": 797,
      "legendary": false
    },
    "Baraa": {
      "elo": 890,
      "legendary": false
    },
    "Takunda": {
      "elo": 956,
      "legendary": false
    },
    "Danilo": {
      "elo": 1171,
      "legendary": false
    },
    "Andreeas": {
      "elo": 967,
      "legendary": false
    },
    "davideb": {
      "elo": 1144,
      "legendary": false
    },
    "Nikita": {
      "elo": 1233,
      "legendary": false
    },
    "Iacob": {
      "elo": 989,
      "legendary": false
    },
    "Damien": {
      "elo": 971,
      "legendary": false
    },
    "Valentin": {
      "elo": 860,
      "legendary": false
    },
    "Milan": {
      "elo": 807,
      "legendary": false
    },
    "Mohamed": {
      "elo": 979,
      "legendary": false
    },
    "Paolo": {
      "elo": 741,
      "legendary": false
    },
    "Fabien": {
      "elo": 879,
      "legendary": false
    },
    "Lucas": {
      "elo": 1303,
      "legendary": false
    },
    "@~❄️": {
      "elo": 798,
      "legendary": false
    },
    "Shahrom": {
      "elo": 1021,
      "legendary": true
    },
    "Loay": {
      "elo": 1193,
      "legendary": false
    },
    "Hay": {
      "elo": 1107,
      "legendary": false
    },
    "Giorgios": {
      "elo": 1178,
      "legendary": true
    },
    "Manuel": {
      "elo": 995,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Momo": {
      "elo": 871,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Alexandre": {
      "elo": 1108,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Mostafa": {
      "elo": 1110,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Johny": {
      "elo": 887,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Ronaldo": {
      "elo": 912,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Leandro": {
      "elo": 896,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Chris": {
      "elo": 947,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Marco": {
      "elo": 1018,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Martin": {
      "elo": 949,
      "legendary": false,
      "calibrationDuels": 10
    },
    "David": {
      "elo": 974,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Yahya": {
      "elo": 983,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Vasilis": {
      "elo": 915,
      "legendary": false,
      "calibrationDuels": 10
    },
    "Raul": {
      "elo": 1100,
      "legendary": false,
      "calibrationDuels": 10
    }
  },
  "adjustments": {
    "Vasilis": -30,
    "fabian": -30,
    "Iacob": -30,
    "Giorgios": -30,
    "Alexandre": -30,
    "Mostafa": -30,
    "Andreeas": -30,
    "Ronaldo": 20,
    "Manuel": 20,
    "Levi": 20,
    "Jack": 20,
    "Nikita": 20,
    "Yahya": 20,
    "gabi": 20,
    "Shahrom": -30,
    "Raul": -30,
    "Momo": -30,
    "Ali": -30,
    "Paolo": -30,
    "davideb": -30,
    "Lucas": -30,
    "Hay": 40,
    "Loay": 40,
    "David": 40,
    "Martin": 40,
    "Marco": 40,
    "Johny": 40,
    "Chris": 40
  }
} : null;
if (placementPreview) {
 for (const [name, delta] of Object.entries(placementPreview.adjustments)) {
  const rating = placementPreview.ratings[name];
  rating.elo += delta;
  rating.legendary ||= rating.elo >= 1350;
 }
}
