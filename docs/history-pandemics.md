# Pandemic coverage — 26 October 2026

The **Pandemics** filter contains 32 sourced records across the human timeline.
Twenty-one are additions; eleven existing pandemic records were recategorised.
Smallpox eradication and vaccine development retain their original categories.
Existing IDs and record order are preserved; additions follow the original 282
records. The thematic-layer follow-up brings the exported atlas to 322 events
and 66 people; the pandemic inventory remains 32 records.

“All pandemics” has no universally agreed historical catalogue. This inventory
covers the standard plague, cholera and influenza sequences, HIV/AIDS and
COVID-19, with related early transregional epidemics and smallpox spread. Ancient
and disputed episodes are included with explicit qualifications. It does not
classify every regional epidemic, endemic infection, or WHO emergency as a
global pandemic. SARS, MERS, Ebola and mpox emergencies are not automatically
counted as global pandemics.

| Group | Viewing periods |
| --- | --- |
| Ancient transregional epidemics | Antonine, c. 165–180; Cyprian, c. 249–262. Pathogens and worldwide reach remain uncertain. |
| First plague pandemic | c. 541–750, beginning with Justinian's plague; successive waves, not uninterrupted local infection. |
| Second plague pandemic | c. 1346–1844, plus the existing 1347–1351 Black Death European-wave record. Regional endings and historical conventions vary. |
| Third plague pandemic | c. 1855–1960; later plague reservoirs persist. |
| Early smallpox spread in the Americas | c. 1518–1527; a phase of intercontinental expansion, not the entire lifetime of smallpox. |
| Early influenza | 1510; 1557–1560; 1580; 1729–1733; 1761–1762; 1780–1782; 1788–1790; 1830–1837; 1847–1848; 1889–1893. |
| Modern influenza | 1918–1919; 1957–1958; 1968–1970; 1977–1978 (age-restricted resurgence); 2009–2010. |
| Seven cholera pandemics | c. 1817–1823; 1829–1850; 1852–1863; 1863–1875; 1881–1896; 1899–1923; 1961–present. |
| HIV/AIDS | 1981 recognition–present. HIV circulated before recognition; this is not an origin date. |
| COVID-19 | 2019 initial reports–present, plus the existing 2020–2023 WHO emergency designation. |

The 1729–1730 and 1732–1733 influenza waves share one interval, as do the
1830–1831, 1832–1833 and 1836–1837 waves. Search aliases include these later
wave years. Some historians count them separately. The 1847 episode's pandemic
classification and the 1889 pathogen are uncertain. The 1977 entry is labelled
as age-restricted, reflecting disagreement over counting it as a conventional
pandemic.

Points represent affected cities, reporting sites or representative outbreak
regions. They are not proven origins, continuously infected locations, spread
routes or global affected-area polygons. Modern city coordinates do not imply
modern national identity at the historical date. Overlapping event symbols are
spaced slightly apart, with connector lines back to their recorded points so
each remains selectable.

All entries use the normal inclusive interval/proximity logic. Thus a pandemic
remains on the map throughout its recorded interval, as well as within the
normal two-year window around it. Long intervals appear under Historical
context after their initial years. Optional `EVENTS` field 15, `ongoing`, is
separate from the numeric viewing endpoint. Its endpoint is 2026, the fixed
atlas cutoff; labels in map tooltips, the reader, the sidebar, local history and
search use “present”. Exports retain both the cutoff and `ongoing` flag.

## Sources

- [NIH influenza historical analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC2720801/): early pandemic chronology and wave grouping, including the 1780 start convention.
- [Pandemic influenza's 500th anniversary](https://pmc.ncbi.nlm.nih.gov/articles/PMC3106245/): 1510 evidence and the limits of retrospective diagnosis.
- [Pandemic influenza: certain uncertainties](https://pmc.ncbi.nlm.nih.gov/articles/PMC3246071/): historical evidence and uncertain worldwide reach, including 1847–1848.
- [1889 pandemic mortality analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC8601188/): repeated waves and pathogen uncertainty.
- [CDC's 20th-century influenza history](https://wwwnc.cdc.gov/eid/article/12/1/05-1254_article): modern waves and the special classification of 1977.
- [WHO historical cholera chronology](https://applications.emro.who.int/docs/em_rc15_8_en.pdf), printed pages 4–6: the first six intervals. Other chronologies differ, so approximate flags and descriptions preserve that uncertainty.
- [WHO cholera fact sheet](https://www.who.int/news-room/fact-sheets/detail/cholera) and [CDC's cholera history](https://wwwnc.cdc.gov/eid/article/17/11/11-1109_article): the continuing seventh pandemic and its emergence in Sulawesi.
- [Max Planck's first-pandemic ancient-genome research](https://www.shh.mpg.de/1332424/plague-pandemic): 541–750 interval.
- [Second-pandemic historical research](https://www.etd.ceu.edu/2016/ganea_sabina.pdf): approximate 1346–1844 convention.
- [Plague historical review](https://doi.org/10.3390/microorganisms12091802): third-pandemic chronology; its broader classification of other outbreaks is not adopted wholesale.
- [Epigraphic research on ancient epidemics](https://www.sciencedirect.com/science/article/pii/S2352409X22001298): approximate Antonine and Cyprian intervals, with no claimed laboratory diagnosis.
- [Early American disease history](https://pubmed.ncbi.nlm.nih.gov/10230264/): Caribbean, Mexican and Andean smallpox chronology. Mortality superlatives in this older source are not adopted.
- [HIV recognition timeline](https://www.hiv.gov/hiv-basics/overview/history/hiv-and-aids-timeline) and [WHO HIV fact sheet](https://www.who.int/en/news-room/fact-sheets/detail/hiv-aids): recognition versus continuing epidemic.
- [WHO COVID-19 background](https://www.who.int/news-room/questions-and-answers/item/coronavirus-disease-covid-19/), [2023 emergency decision](https://www.who.int/news/item/05-05-2023-statement-on-the-fifteenth-meeting-of-the-international-health-regulations-(2005)-emergency-committee-regarding-the-coronavirus-disease-(covid-19)-pandemic) and [2026 surveillance](https://data.who.int/dashboards/covid19/variants): initial reports, emergency designation and continuing disease are separate concepts.

Per-record fields and reasons live in `history-event-corrections.json`; the
generated inventory is `history-accuracy-audit.json`. Structural checks do not
certify every historical interpretation or prove exhaustive coverage.

## Verification

`node --test tests/history-pandemics.test.cjs` checks coverage groups, real map
filtering throughout intervals, proximity boundaries, continuing labels, search
aliases and shared category state. `node tests/history-pandemics.browser.mjs`
checks map markers, the menu, reader, search, sharing and narrow layouts using
the existing isolated Chrome debugging setup. The standalone prototype is
rebuilt with `node prototypes/atlas-ui/build-preview.cjs`.
