{
  "settings": {
    "people": [
      { "id": "p1alice1", "name": "Alice" },
      { "id": "p2bob222", "name": "Bob" }
    ],
    "incomeLines": [
      { "id": "inc-al-1", "name": "Salaire Alice", "personId": "p1alice1" },
      { "id": "inc-bo-1", "name": "Salaire Bob", "personId": "p2bob222" },
      { "id": "inc-cm-1", "name": "Recettes exceptionnelles", "personId": null }
    ],
    "budgetMode": "proportional",
    "monthlyBudget": null,
    "monthsToShow": 4,
    "startMonth": "2026-07",
    "tutorialDone": true,
    "categories": [
      {
        "id": "cat-mais",
        "name": "Maison",
        "expenses": [
          { "id": "exp-loye", "name": "Loyer", "locked": true, "incomeLineId": null },
          { "id": "exp-elec", "name": "Électricité", "locked": false, "incomeLineId": null },
          { "id": "exp-inte", "name": "Internet", "locked": true, "incomeLineId": null },
          { "id": "exp-assu", "name": "Assurance habitation", "locked": true, "incomeLineId": null }
        ]
      },
      {
        "id": "cat-quot",
        "name": "Quotidien",
        "expenses": [
          { "id": "exp-cour", "name": "Courses", "locked": false, "incomeLineId": null },
          { "id": "exp-esse", "name": "Essence", "locked": false, "incomeLineId": null },
          { "id": "exp-tele", "name": "Forfaits téléphone", "locked": true, "incomeLineId": null }
        ]
      },
      {
        "id": "cat-lois",
        "name": "Loisirs",
        "expenses": [
          { "id": "exp-rest", "name": "Restaurants", "locked": false, "incomeLineId": null },
          { "id": "exp-abos", "name": "Abonnements streaming", "locked": true, "incomeLineId": null },
          { "id": "exp-sort", "name": "Sorties", "locked": false, "incomeLineId": null }
        ]
      },
      {
        "id": "cat-epar",
        "name": "Épargne",
        "expenses": [
          { "id": "exp-livr", "name": "Livret A", "locked": true, "incomeLineId": null }
        ]
      }
    ]
  },
  "months": {
    "2026-07": {
      "incomes": { "inc-al-1": 2450, "inc-bo-1": 2100, "inc-cm-1": 0 },
      "real": { "p1alice1": 1520.4, "p2bob222": 1310.75 },
      "expenses": {
        "exp-loye": 980,
        "exp-elec": 72.5,
        "exp-inte": 39.99,
        "exp-assu": 24.9,
        "exp-cour": 486.3,
        "exp-esse": 145.2,
        "exp-tele": 29.98,
        "exp-rest": 118.5,
        "exp-abos": 27.97,
        "exp-sort": 64,
        "exp-livr": 300
      }
    },
    "2026-08": {
      "incomes": { "inc-al-1": 2450, "inc-bo-1": 2100, "inc-cm-1": 150 },
      "real": { "p1alice1": 1655.1, "p2bob222": 1402.6 },
      "expenses": {
        "exp-loye": 980,
        "exp-elec": 65.8,
        "exp-inte": 39.99,
        "exp-assu": 24.9,
        "exp-cour": 512.75,
        "exp-esse": 188.4,
        "exp-tele": 29.98,
        "exp-rest": 156.2,
        "exp-abos": 27.97,
        "exp-sort": 142.5,
        "exp-livr": 300
      }
    },
    "2026-09": {
      "incomes": { "inc-al-1": 2530, "inc-bo-1": 2100, "inc-cm-1": 0 },
      "real": { "p1alice1": 1480.9, "p2bob222": 1295.3 },
      "expenses": {
        "exp-loye": 980,
        "exp-elec": 78.2,
        "exp-inte": 39.99,
        "exp-assu": 24.9,
        "exp-cour": 449.6,
        "exp-esse": 132.85,
        "exp-tele": 29.98,
        "exp-rest": 92,
        "exp-abos": 27.97,
        "exp-sort": 55.5,
        "exp-livr": 350
      }
    }
  }
}
