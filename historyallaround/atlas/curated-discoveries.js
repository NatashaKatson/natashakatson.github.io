/* Authored discoveries. IDs are permanent because exact-view links retain them.
 * A context stop's year is a viewing date within a longer period, not an event date.
 * Coordinates locate a city/site, not a person's whereabouts or a polity's extent. */
(function (root) {
  const discoveries = [{
    id: "cleopatra-world",
    person: "Cleopatra",
    title: "What was happening in the world when Cleopatra lived?",
    subtitle: "One lifetime. Five places. A much bigger world.",
    start: -69, end: -30,
    introduction: "Cleopatra VII lived from 69 to 30 BC. While she ruled Egypt, cities and kingdoms across Africa, Asia and the Americas were following their own histories. Visit five places within her lifetime.",
    sources: [["The Met · Cleopatra's lifetime", "https://www.metmuseum.org/art/collection/search/12649"]],
    stops: [
      {
        id: "alexandria", title: "Cleopatra takes the throne", location: "Alexandria · Egypt",
        year: -51, point: [29.92, 31.2], kind: "event",
        text: "In 51 BC, Cleopatra VII began her reign in Egypt. Alexandria is our starting point for looking beyond her kingdom to the wider world of her lifetime.",
        sources: [["UCL · Cleopatra VII", "https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/cleopatravii.html"]],
      },
      {
        id: "changan", title: "A great capital in Han China", location: "Chang’an · East Asia",
        year: -50, point: [108.9, 34.27], kind: "context",
        text: "Far to the east, the Western Han dynasty ruled from Chang’an. Palaces, residential districts and two busy market areas made it one of the ancient world's largest urban centres. The dynasty had begun long before Cleopatra was born and would outlast her.",
        sources: [["The Met · Han dynasty", "https://www.metmuseum.org/essays/han-dynasty-206-b-c-220-a-d"]],
      },
      {
        id: "meroe", title: "The kingdom south of Egypt", location: "Meroë · Nile Valley",
        year: -50, point: [33.724, 16.938], kind: "context",
        text: "Up the Nile, in what is now Sudan, Meroë was a royal city of Kush. This heartland of a major African kingdom had its own palaces, temples and royal pyramid cemeteries. Kush's history stretched from the eighth century BC into the fourth century AD.",
        sources: [["UNESCO · Island of Meroe", "https://whc.unesco.org/en/list/1336/"]],
      },
      {
        id: "monte-alban", title: "A Zapotec city above the valley", location: "Monte Albán · Mesoamerica",
        year: -50, point: [-96.7675, 17.043], kind: "context",
        text: "Across the Atlantic, Monte Albán was already centuries into its history as a Zapotec capital in the Oaxaca Valley. Its urbanization included a ceremonial centre, hillside terraces and systems for managing water. Cleopatra's lifetime falls within the broad Monte Albán II phase, about 300 BC–AD 100.",
        sources: [["UNESCO · Monte Albán", "https://whc.unesco.org/en/list/415/"]],
      },
      {
        id: "rome", title: "Caesar is assassinated", location: "Rome · Mediterranean Europe",
        year: -44, point: [12.48, 41.89], kind: "event",
        text: "In 44 BC, Julius Caesar was assassinated in Rome. Cleopatra was still alive: her reign continued until 30 BC. These histories share a lifetime, even though the places in this discovery had very different relationships with Egypt.",
        sources: [["British Museum · Augustus and Caesar's assassination", "https://www.britishmuseum.org/collection/term/BIOG57074"], ["UCL · Cleopatra VII", "https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/cleopatravii.html"]],
      },
    ],
  }];
  if (typeof module === "object") module.exports = discoveries;
  else root.CuratedDiscoveries = discoveries;
})(typeof window === "object" ? window : globalThis);
