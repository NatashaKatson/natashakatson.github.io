# Historical figures coverage audit

Reviewed 6 November 2026. The public atlas HTML was fetched successfully during this audit: it contains **66 people and no Rasputin record**. This checkout now contains **123 people**, including **57 additions**. The changes are local and have not been deployed by this task.

## Findings and fixes

| Question | Finding | Change |
| --- | --- | --- |
| Why is Rasputin missing? | He is absent from the public and original local `PEOPLE` arrays. Neither coordinates nor filtering explains his absence. | Added Grigori Rasputin, 1869–1916, with a scholarly biography and a Saint Petersburg / Petrograd court anchor. |
| Where do people come from? | `static/historyallaround/atlas/index.html` embeds a manually curated `PEOPLE` array. There is no automatic Wikidata or Wikipedia biography import. `ppl` normalises rows; `byId` indexes them. | Appended records, preserving all original `p0`–`p65` IDs. |
| Do exports drive the map? | No. `scripts/export-history-data.cjs` derives the JSON/CSV downloads from the inline arrays. Editing an export alone does not add someone to the atlas. | Regenerated exports with the new people and review metadata. |
| Are dates consistent? | The old map used `halfWin(year) * 0.25` as a lifespan tolerance. The people list then applied a strict lifespan check, allowing map/list disagreement near births and deaths. | Both now use inclusive birth/death years. Rasputin appears in 1869, 1900 and 1916, and is absent in 1868 and 1917. |
| Can existing people be lost to event filters? | Event categories filter `activeEvents()`, not the people collection. The separately developed Explore controls filter the sidebar by associated region; those controls explicitly apply to the list. | Preserved these controls. Verified category filters do not hide person markers. |
| Does map geography exclude records? | Globe rendering culls the far hemisphere; zoom/pan can move an associated point off screen. Every original record has finite coordinates in range. | Checked every person in the flat-map rendering path. Selecting a person outside their lifespan now changes to their birth year; normal selection centres their associated point. |
| Can markers obscure each other? | Several people share exactly the same city point. Events can also overlap them. | Spread nearby people using the existing marker-placement helper, reserve their positions before placing events, and draw connectors to the underlying geographic anchor. Moscow’s Lenin/Stalin markers are independently selectable. |
| Can living people be included? | The original normaliser and validators required a numeric death year. | Support `null` death years, bounded internally by the atlas’s 2026 coverage limit. Search, details and contemporaries say “Born …”; exports retain `null`. Living records are excluded from completed-lifespan quizzes. |
| Does search find alternate names? | Person search indexed only the displayed name, wiki slug and role. | Added reviewed aliases, including Grigory/Grigorii Rasputin, Григорий Распутин, Tatanka Iyotanka, Li Po and accent-free variants. It also indexes the reviewed fields and location. |

The Rasputin source is [1914–1918 Online’s scholarly biography](https://encyclopedia.1914-1918-online.net/wp-content/uploads/2023/01/ams/957382/pdf/1914-1918-Online-rasputin_grigorii_efimovich-2014-10-08.pdf). The [University of Pennsylvania library authority](https://onlinebooks.library.upenn.edu/webbin/who/Rasputin%2C%20Grigorii%20Efimovich%2C%201869-1916) corroborates 1869–1916. His marker represents his court association, not his Siberian birthplace or a verified location for each year. His Gregorian and Old Style dates fall in the same birth/death years, so calendar conversion is not the cause of the omission.

## Systematic coverage comparison

All five requested periods were checked against all six existing atlas regions, with an additional review of fields and Indigenous representation. Period boundaries below are practical audit bins, not universal cultural chronologies. Cells count people whose recorded lifespans overlap a period; the same person can occur in more than one row. The region follows the associated marker, not ethnicity, nationality, birthplace or full life trajectory. North Africa belongs to the atlas’s `me` region.

| Region | Before | After | Added |
| --- | ---: | ---: | ---: |
| Europe | 27 | 42 | 15 |
| Middle East & North Africa | 10 | 21 | 11 |
| Sub-Saharan Africa | 5 | 12 | 7 |
| Asia | 13 | 24 | 11 |
| Americas | 8 | 19 | 11 |
| Oceania | 3 | 5 | 2 |

Each cell below is **before → after**.

| Period | Europe | Middle East & North Africa | Sub-Saharan Africa | Asia | Americas | Oceania |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ancient | 7 → 9 | 5 → 7 | 0 → 0 | 5 → 8 | 0 → 0 | 0 → 0 |
| Medieval | 2 → 3 | 4 → 8 | 2 → 2 | 3 → 6 | 0 → 1 | 0 → 0 |
| Renaissance & early modern | 8 → 12 | 1 → 2 | 0 → 2 | 4 → 6 | 2 → 3 | 0 → 0 |
| 18th & 19th centuries | 12 → 19 | 0 → 4 | 2 → 3 | 3 → 6 | 4 → 12 | 3 → 5 |
| 20th & 21st centuries | 4 → 10 | 0 → 2 | 2 → 7 | 2 → 6 | 3 → 6 | 1 → 2 |

Coverage now extends beyond rulers through philosophy, science, literature, religion, medicine, music, technology and social movements. Additions include Ban Zhao, Aryabhata, Ibn al-Haytham, Hildegard, Rumi, Ahmad Baba, Sor Juana, Mary Seacole, Tagore, Raman, Abdus Salam, Achebe, Maathai and Mirzakhani. Political inclusion records historical influence; the Hitler and Stalin descriptions explicitly identify the violence of their regimes.

Indigenous additions include Pakal (Maya), Tecumseh (Shawnee), Sitting Bull (Hunkpapa Lakota), Truganini (Palawa), Te Puea Hērangi (Waikato Māori) and Rigoberta Menchú (K’iche’ Maya). The Truganini qualification expressly avoids implying that Tasmanian Aboriginal peoples disappeared at her death. These additions complement the separate Indigenous community/event dataset; people are not substitutes for community or territorial history.

## Evidence and date conventions

Each addition links to an independent source: scholarly reference works, university projects, museums, national libraries, government histories or Nobel Prize records. Descriptions are short editorial summaries. Linked sources support the identity, lifespan and principal contribution; representative city/region points are approximate geographic anchors, not surveyed residences. Some source sites block automated full-page access; indexed biographies/catalogue records were also used. This is a documented editorial expansion, not independent certification of every claim in the full legacy dataset.

The map runs at **year resolution**. Birth and death years are inclusive, ages are approximate and there is no year zero. Exact calendar dates are retained in optional `birthDate`/`deathDate` metadata only when supported; other values remain null, rather than inventing a January 1 date. Ancient BCE years remain signed year numbers. Approximate lifespans carry `approx` and an explicit `dateNote`; the map tooltip, search and biography show `c.`.

Specific uncertainty decisions:

- Plato uses approximate 428–348 BCE, with the commonly given 428/427 and 348/347 alternatives in the note.
- Sima Qian, Ban Zhao, Hannibal and Aryabhata retain qualified conventional lifespans.
- Ibn al-Haytham follows MacTutor’s approximate 965–1039; the note acknowledges references using about 1040.
- Khayyam’s dates are reconstructed; Sor Juana’s 1648/1651 birth dispute remains explicit.
- Nzinga, Wheatley, Seacole, Tecumseh, Sitting Bull, Truganini and Yaa Asantewaa have approximate births.
- Stalin uses the documented 1878 birth year, with the former official 1879 date noted.
- Al-Afghani’s 1838/1839 birth uncertainty and Iranian birthplace are explicit.
- Tu Youyou, Wole Soyinka and Rigoberta Menchú have no recorded death. The runtime upper bound is 2026, never a death date or a prediction of a future lifespan. These records require periodic updates.

Only three original records had an extra source link, one of which was Wikipedia. There are now 60 extra source links, including 59 independent links. **63 legacy people still rely on their Wikipedia background link alone**; this audit checked their structural validity but did not independently reverify all their biographies. `reviewedOn`, field tags, aliases, place labels and uncertainty notes identify the new review work without retroactively claiming to have reviewed every legacy row.

## Remaining coverage gaps and next research queue

The atlas is a selected collection. Zero cells describe missing records, never the absence of historical people or achievements. Earlier sub-Saharan Africa, the ancient Americas, and Oceania before the eighteenth century still need substantial work. Arts and music, Southeast Asia, the Caribbean, Indigenous North America beyond the new entries, and other African societies remain thinly represented. Regional counts alone cannot measure historical significance, gender balance or community representation.

| Candidate or area | Current status | Required follow-up |
| --- | --- | --- |
| Hatshepsut and Amanirenas | Missing; identified for ancient African coverage | Resolve source-supported birth bounds separately from securely attested reigns. Do not use a reign start as a birth year. |
| Lady Six Sky | Missing; identified for Maya coverage | The year 682 is her arrival at Naranjo, not an established birth year. Research birth bounds or add an explicitly supported floruit model before adding a lifespan. |
| Kupe and other early Oceanian navigators | Missing | Work with Indigenous and scholarly sources on traditions, dates and attribution; avoid inventing exact lifespans. |
| Amina of Zazzau | Missing | Reconcile contested chronology and later traditions before choosing a lifespan. |
| Al-Biruni, Fatima al-Fihri, further Islamic-world scholars | Missing | Verify biographical chronology and associated places individually; distinguish traditional attribution from contemporary evidence. |
| Michelangelo, Hokusai, Tarsila do Amaral, Ben Enwonwu; additional music history | Missing | Prioritise museum/artist estate and scholarly biographies to strengthen arts beyond the current small selection. |
| Hong Xiuquan, José de San Martín, additional Southeast Asian and Latin American leaders | Missing | Add individually sourced lifespans and concise descriptions, balancing political coverage with other fields. |
| Additional twentieth/21st-century activists and scientists | Still a small selection | Verify current life/death status and preserve annual coverage semantics. |

These are research candidates, not verified additions. The [Metropolitan Museum’s Hatshepsut exhibition](https://www.metmuseum.org/exhibitions/listings/2006/hatshepsut) gives reign dates; it does not justify treating them as her lifespan. No undocumented date was added simply to fill a matrix cell.

## Addition register

Every new entry has a name, lifespan or open birth interval, short description, latitude/longitude, region, background wiki identifier, independent source and associated-place label. Descriptions and full metadata are available in `exports/historyallaround/atlas-data.json` and `people.csv`. Exact ISO calendar dates, where present, are supplementary to these annual intervals.

| Person | Recorded years | Associated place | Evidence |
| --- | --- | --- | --- |
| Grigori Rasputin | 1869–1916 | Saint Petersburg / Petrograd, imperial court | [Source](https://encyclopedia.1914-1918-online.net/wp-content/uploads/2023/01/ams/957382/pdf/1914-1918-Online-rasputin_grigorii_efimovich-2014-10-08.pdf) |
| Plato | c. 428 BCE–348 BCE | Athens, Academy and philosophical activity | [Source](https://iep.utm.edu/plato/) |
| Sima Qian | c. 145 BCE–86 BCE | Chang’an, Han court and historical writing | [Source](https://ethicsofsuicide.lib.utah.edu/selections/sima-qian/) |
| Sappho | c. 630 BCE–570 BCE | Mytilene, Lesbos, associated home | [Source](https://www.britishmuseum.org/sites/default/files/2021-11/Desire_Love_Identity_Audio_Transcript_15.11.21.pdf) |
| Hannibal | c. 247 BCE–183 BCE | Carthage, home polity | [Source](https://doi.org/10.1093/obo/9780199791279-0272) |
| Ban Zhao | c. 45–116 | Luoyang, Eastern Han court | [Source](https://chinesebox.voices.wooster.edu/banzhao/) |
| Augustine of Hippo | 354–430 | Hippo Regius, present-day Annaba, bishopric | [Source](https://plato.stanford.edu/entries/augustine/) |
| Aryabhata | c. 476–550 | Kusumapura / Patna region, approximate place of work | [Source](https://mathshistory.st-andrews.ac.uk/Biographies/Aryabhata_I/) |
| K’inich Janaab’ Pakal | 603–683 | Palenque, Maya royal court | [Source](https://revistas.inah.gob.mx/index.php/lavozinah/issue/download/2518/2728) |
| Li Bai | 701–762 | Jiangyou, Sichuan, region where he grew up | [Source](https://www.poetryfoundation.org/poets/li-po) |
| Ibn al-Haytham | c. 965–1039 | Cairo, associated place of scientific work | [Source](https://mathshistory.st-andrews.ac.uk/Biographies/Al-Haytham/) |
| Omar Khayyam | c. 1048–1131 | Nishapur, associated home and burial place | [Source](https://www.iranicaonline.org/articles/khayyam-omar/khayyam-omar-i-life/) |
| Hildegard of Bingen | 1098–1179 | Rupertsberg near Bingen, abbey and place of work | [Source](https://epistolae.ctl.columbia.edu/woman/115.html) |
| Rumi | 1207–1273 | Konya, principal place of teaching and writing | [Source](https://www.loc.gov/exhibits/thousand-years-of-the-persian-book/classical-persian-poetry.html) |
| Ibn Khaldun | 1332–1406 | Tunis, birthplace and a centre of his scholarship | [Source](https://www.loc.gov/item/2021666190/) |
| Sejong the Great | 1397–1450 | Seoul, Joseon royal court | [Source](https://www.worldhistory.org/Sejong_the_Great/) |
| Guru Nanak | 1469–1539 | Nankana Sahib, birthplace in Punjab | [Source](https://www.sikhcoalition.org/wp-content/uploads/2021/03/SikhCelebrations-2021.pdf) |
| Martin Luther | 1483–1546 | Wittenberg, university and Reformation activity | [Source](https://www.luther.de/en/leben/) |
| Ahmad Baba | 1556–1627 | Timbuktu, centre of scholarship | [Source](https://tombouctoumanuscripts.uct.ac.za/overview/timbuktus-history) |
| Johannes Kepler | 1571–1630 | Prague, place of astronomical work | [Source](https://mathshistory.st-andrews.ac.uk/Biographies/Kepler/) |
| Nzinga | c. 1583–1663 | Matamba, approximate regional anchor for her kingdom | [Source](https://www.metmuseum.org/essays/ana-nzinga-queen-of-ndongo) |
| René Descartes | 1596–1650 | Leiden, associated period of work in the Dutch Republic | [Source](https://plato.stanford.edu/entries/descartes/) |
| Baruch Spinoza | 1632–1677 | Amsterdam, birthplace and early intellectual life | [Source](https://plato.stanford.edu/entries/spinoza/) |
| Sor Juana Inés de la Cruz | c. 1651–1695 | Mexico City, convent and literary activity | [Source](https://poets.org/poet/sor-juana-ines-de-la-cruz) |
| Phillis Wheatley Peters | c. 1753–1784 | Boston, place of literary work following forced transport from West Africa | [Source](https://www.poetryfoundation.org/poets/phillis-wheatley) |
| Mary Wollstonecraft | 1759–1797 | London, associated home and writing | [Source](https://plato.stanford.edu/entries/wollstonecraft/) |
| Tecumseh | c. 1768–1813 | Springfield, Ohio region, approximate birthplace | [Source](https://www.biographi.ca/en/bio/tecumseh_5F.html) |
| Mary Seacole | c. 1805–1881 | Kingston, Jamaica, birthplace and early medical learning | [Source](https://www.npg.org.uk/collections/search/personExtended/mp70879/mary-jane-seacole-nee-grant?tab=biography) |
| Truganini | c. 1812–1876 | D’Entrecasteaux Channel, Tasmania, approximate home region | [Source](https://adb.anu.edu.au/biography/trugernanner-truganini-4752) |
| Frederick Douglass | 1818–1895 | Cedar Hill, Washington, DC, later home | [Source](https://www.nps.gov/people/frederick-douglass.htm) |
| Karl Marx | 1818–1883 | London, major period of research and writing | [Source](https://plato.stanford.edu/entries/marx/) |
| Lakshmibai | 1828–1858 | Jhansi, kingdom and centre of resistance | [Source](https://www.qrhmuseum.com/lakshmibai-the-rani-of-jhansi) |
| Sitting Bull | c. 1831–1890 | Standing Rock region, associated home and community | [Source](https://americanindian.si.edu/nk360/plains-belonging-nation/oceti-sakowin.cshtml) |
| Yaa Asantewaa | c. 1840–1921 | Ejisu, Asante, seat of her office | [Source](https://encyclopaediaafricana.com/asantewaa-yaa/) |
| José Martí | 1853–1895 | Havana, birthplace | [Source](https://guides.loc.gov/world-of-1898/jose-marti) |
| Nikola Tesla | 1856–1943 | New York City, major period of electrical research | [Source](https://academic.oup.com/american-national-biography/reference/63042/reference-article-abstract/570591285) |
| Rabindranath Tagore | 1861–1941 | Kolkata / Calcutta, birthplace and literary life | [Source](https://www.nobelprize.org/prizes/literature/1913/tagore/facts/) |
| Vladimir Lenin | 1870–1924 | Moscow, Soviet government | [Source](https://encyclopedia.ushmm.org/content/en/article/vladimir-lenin) |
| Winston Churchill | 1874–1965 | London, seat of government | [Source](https://www.gov.uk/government/history/past-prime-ministers/winston-churchill) |
| Joseph Stalin | 1878–1953 | Moscow, Soviet government | [Source](https://encyclopedia.1914-1918-online.net/wp-content/uploads/2023/01/ams/959092/pdf/1914-1918-Online-stalin_joseph-2017-01-31.pdf) |
| Te Puea Hērangi | 1883–1952 | Ngāruawāhia, Tūrangawaewae marae | [Source](https://teara.govt.nz/en/biographies/3h17/herangi-te-kirihaehae-te-puea) |
| C. V. Raman | 1888–1970 | Bengaluru / Bangalore, Indian Institute of Science and later research | [Source](https://www.nobelprize.org/prizes/physics/1930/raman/biographical/) |
| Adolf Hitler | 1889–1945 | Berlin, seat of the Nazi regime | [Source](https://encyclopedia.ushmm.org/content/en/article/adolf-hitler) |
| Gabriela Mistral | 1889–1957 | Vicuña, Chile, birthplace | [Source](https://www.loc.gov/item/n50033817/gabriela-mistral-chile-1889-1957/) |
| Alan Turing | 1912–1954 | Manchester, later work on computing and mathematical biology | [Source](https://turingarchive.kings.cam.ac.uk/about-alan-turing) |
| Abdus Salam | 1926–1996 | Jhang, Punjab, birthplace | [Source](https://www.nobelprize.org/prizes/physics/1979/salam/facts/) |
| Chinua Achebe | 1930–2013 | Ogidi, Nigeria, birthplace and formative community | [Source](https://academic.oup.com/reference/62328/reference-article-abstract/553807702) |
| Tu Youyou | 1930–open | Beijing, China Academy of Chinese Medical Sciences | [Source](https://www.nobelprize.org/prizes/medicine/2015/tu/facts/) |
| Desmond Tutu | 1931–2021 | Cape Town, archbishopric | [Source](https://www.nobelprize.org/prizes/peace/1984/tutu/facts/) |
| Wole Soyinka | 1934–open | Abeokuta, Nigeria, birthplace | [Source](https://www.nobelprize.org/prizes/literature/1986/soyinka/facts/) |
| Wangari Maathai | 1940–2011 | Nairobi, Green Belt Movement activity | [Source](https://www.nobelprize.org/prizes/peace/2004/maathai/facts/) |
| Rigoberta Menchú Tum | 1959–open | Chimel, Guatemala, approximate birthplace and community anchor | [Source](https://www.nobelprize.org/prizes/peace/1992/tum/facts/) |
| Maryam Mirzakhani | 1977–2017 | Tehran, birthplace and early mathematical education | [Source](https://www.ias.edu/scholars/maryam-mirzakhani) |
| Huda Shaarawi | 1879–1947 | Cairo, feminist organising and public life | [Source](https://catalogue.bnf.fr/ark:/12148/cb124745405) |
| Rifa’a al-Tahtawi | 1801–1873 | Cairo, translation school and educational work | [Source](https://www.rem.routledge.com/articles/al-tahtawi-rifaa-1801-1873) |
| Abd al-Qadir | 1808–1883 | Mascara, Algeria, centre of his emirate | [Source](https://islamansiklopedisi.org.tr/abdulkadir-el-cezairi) |
| Jamal al-Din al-Afghani | c. 1838–1897 | Asadabad, Iran, associated birthplace | [Source](https://www.iranicaonline.org/articles/afgani-jamal-al-din/) |

## Validation and reproduction

- `node scripts/audit-history-people.cjs docs/history-people-audit.json` generates the before/after region and period matrix, addition register and integrity errors.
- `node scripts/audit-history-accuracy.cjs docs/history-accuracy-audit.json` checks the entire existing dataset and border/search integrity.
- `node scripts/export-history-data.cjs` regenerates the version 3 JSON/CSV schema. Person death years stay null for open lifespans. Original positional IDs stay stable because additions are appended.
- `node --test tests/*.test.cjs` passes all 109 tests, including the new people validation, lifespan boundaries, open-lifespan display/export, search alias and quiz regressions.
- `tests/history-people-coverage.browser.mjs` checks all 123 people in the list and flat-map hit data at representative lifetime years; Rasputin’s endpoints; event filters; shared-city selection; uncertainty labels; living figures; real search navigation; and the People tab/biography at 390px. This is an emulated mobile check, not a physical-device test.
- Existing People-tab, global-search and daily-challenge browser regressions are also run against the local preview.
- Production build: Hugo **0.110.0**, `hugo --minify`.

Browser tests use the repository’s CDP harness with an isolated Chrome profile; set `ATLAS_CDP_URL` and `ATLAS_TEST_URL` for the local server. Live publication remains the repository’s GitHub Pages workflow on a push to `main`.
