/* Authored discoveries. IDs are permanent because exact-view links retain them.
 * A context stop's year is a viewing date within a longer period, not an event date.
 * Coordinates locate a city/site, not a person's whereabouts or a polity's extent. */
(function (root) {
  const discoveries = [{
    id: "cleopatra-world",
    person: "Cleopatra",
    contemporaries: ["Cleopatra", "Emperor_Yuan_of_Han"],
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
  }, {
    id: "diaper-care-1961", format: "same-year", topic: "Diapers",
    title: "Changing a baby in 1961",
    subtitle: "United States & Soviet Union · the same everyday task",
    start: 1961, end: 1961,
    introduction: "What went into a baby's diaper, and what happened after a change? Compare a disposable option reaching US shops with the reusable approach described in a Soviet household guide of the period.",
    contextTitle: "When did disposables reach the Soviet Union?",
    context: "Soviet baby-diaper production is documented by January 1986 in the Syasstroy factory newspaper. This establishes production by that date, not the first sale of an imported diaper or a Pampers brand launch. The 1961 comparison uses a 1959 household manual as period evidence, rather than a survey of every Soviet family.",
    sources: [["Syassky Rabochy · 30 January 1986 (Russian)", "https://ugar.syasnews.ru/syasskij-rabochij/syasskij-rabochij-1986-god/20237-poisk-molodykh"]],
    stops: [
      {
        id: "us-diapers", title: "A disposable option in shops", location: "United States",
        year: 1961, point: [-89.59, 40.69], kind: "event", evidenceLabel: "1961 product launch",
        text: "Disposable diapers were available to buy. One documented milestone is the 1961 US launch of Pampers. Disposables existed before this brand, and cloth diapers remained in use: a new product on sale did not mean every household had switched.",
        mapNote: "Peoria, Illinois · an early test market, not the extent of availability",
        image: "images/meanwhile/diaper.svg", imageAlt: "Illustration of an early disposable diaper with a safety pin",
        sources: [["Pampers · launch history", "https://www.pampers.com/en-us/pampers-history"], ["EDANA · Seven decades of diapers", "https://www.edana.org/docs/default-source/absorbent-hygiene-products/edana---seven-decades-of-diapers.pdf"]],
      },
      {
        id: "soviet-cloth", title: "Cloth, gauze and washing", location: "Soviet Union",
        year: 1961, point: [37.62, 55.75], kind: "context", evidenceLabel: "Period practice · 1959 manual",
        text: "The Soviet household guide Domovodstvo (1959) describes cloth diapers folded into a triangle and recommends double-layer gauze. It tells parents to wash and iron the baby's linen. This documents a reusable approach around 1961; it does not establish that every family used exactly the same method.",
        mapNote: "Moscow · publication city of the guide; a national practice has no single map point",
        image: "images/meanwhile/cloth.svg", imageAlt: "Illustration of folded cloth and gauze drying on a line",
        sources: [["Domovodstvo · 1959, infant-care chapter (Russian)", "https://sheba.spb.ru/za/domovodstvo-1959.htm"]],
      },
    ],
  }, {
    id: "period-care-1980", format: "same-year", topic: "Menstrual care",
    title: "Managing a period around 1980",
    subtitle: "United States & Soviet Union · pads, cloth and cotton wool",
    start: 1980, end: 1980,
    introduction: "The same monthly need, with different supplies at hand. Compare packaged disposable pads in the US with cloth and cotton-wool methods documented in Soviet menstrual histories.",
    contextTitle: "A snapshot of a period",
    context: "1980 is a viewing year within a broader period, not an exact introduction date. The Soviet account draws on interviews and memoirs about Soviet and post-Soviet Russia; it is not a survey of every Soviet republic. Product availability and personal routines varied within both countries.",
    sources: [],
    stops: [
      {
        id: "us-pads", title: "Packaged disposable pads", location: "United States",
        year: 1980, point: [-75.147, 39.949], kind: "context", evidenceLabel: "Commercial option for decades",
        text: "Disposable menstrual pads had been sold in the US for decades. A preserved magazine advertisement from 1926 shows them marketed as disposable protection. By this viewing period, they were an established product category; availability does not tell us what every person chose or could afford.",
        mapNote: "Philadelphia · institute preserving the advertisement, not a product launch site",
        image: "images/meanwhile/pad.svg", imageAlt: "Illustration of a disposable menstrual pad and a plain package",
        sources: [["Science History Institute · disposable-pad advertisement, 1926", "https://digital.sciencehistory.org/works/1xs0m8v"]],
      },
      {
        id: "soviet-period-care", title: "Cloth and cotton wool", location: "Soviet Union",
        year: 1980, point: [37.62, 55.75], kind: "context", evidenceLabel: "Practice documented into the 1980s",
        text: "A historical study drawing on 80 interviews describes Soviet menstrual care using cloths, cotton wool and improvised protection into the 1980s. These accounts document the work of preparing and managing supplies, rather than a single product used by everyone.",
        mapNote: "Moscow · geographic reference for the country; interviews cover multiple places",
        image: "images/meanwhile/cotton.svg", imageAlt: "Illustration of cotton wool, gauze and folded cloth",
        sources: [["Vasilyev & Konovalova · Changing Menstrual Habits (2023)", "https://publications.hse.ru/en/articles/813081992"]],
      },
    ],
  }];
  if (typeof module === "object") module.exports = discoveries;
  else root.CuratedDiscoveries = discoveries;
})(typeof window === "object" ? window : globalThis);
