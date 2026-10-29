# Women’s rights history — 27 October 2026

The atlas has a dedicated **👩 Women’s rights** button and chronological browser,
separate from Layers. It contains **76 milestones**, including **41 abortion and
reproductive-rights histories**, across all six atlas regions. The atlas now has
422 events and 66 people. The existing New Zealand suffrage record retains its
`e123` identity; 75 new women’s rights records are appended after the previous
catalogue, including 22 added for US abortion history. The original event identities remain unchanged.

The browser offers search, topic and region filters, a **U.S. abortion history**
shortcut in Topic, a Show on map checkbox, chronological groups, result counts and dated navigation to source-linked readers.
All periods remain discoverable regardless of the map’s selected year. Choosing
a milestone enables its category and opens its recorded date. Map visibility
shares state with Filters, comparison maps and saved views. The woman emoji
appears in the button, catalogue, event markers, lists and readers.

The country-color scoring view was removed on 29 October 2026. The atlas retains
the dated milestones and their sources; country fills do not rate women’s rights.

## Scope and interpretation

Topics include voting and representation; education; equality, property and
family law; movements and advocacy; protection from violence; and abortion and
reproductive rights. Progress and reversals are both represented. Earlier entries
are documented contexts and advocacy, not claims that modern rights originated
in one place. The 172 BC Egyptian record identifies a surviving contract; the
1215 record qualifies limited feudal protections; the City of Ladies is an
approximate publication milestone.

Every entry is a dated milestone, without an invented continuous window of legal
entitlement. Descriptions distinguish enactment, commencement, implementation,
restricted eligibility and practical access. Examples include British suffrage
in 1918 versus 1928, racial exclusions in Australian and US voting, French voting
reform issued in Algiers, the Soviet abortion reforms and reversal, Roe in 1973
and Dobbs in 2022, and Argentine approval in 2020 versus promulgation in 2021.
The Maputo Protocol is a treaty adoption, not simultaneous enactment across Africa.

Abortion entries describe historical legal changes. They do not supply medical
instructions or a directory of current legal eligibility. Reform markers do not
imply that care became available equally or that later law stayed the same.
Points locate associated places or institutions rather than every person affected
by a reform.

## US abortion history

The dedicated Topic shortcut includes **24 milestones** from 1873–2024: eight
federal decisions, legislation and drug-approval milestones, and sixteen dated
entries across twelve states: Arizona, California, Colorado, Florida, Hawaii,
Kansas, Michigan, Missouri, New York, Ohio, Texas and Washington. Search accepts
`USA`, `US`, `U.S.`, the country name and state names in both the rights browser
and global search. State labels appear in the chronology and reader.

Coverage includes the Comstock Act, Hyde funding restrictions, Harris v. McRae,
Roe, Casey, FACE, FDA approval of mifepristone and Dobbs; pre-Roe state reforms;
New York’s 2019 statute; Texas’s separate 2021 SB 8 and 2022 trigger-law start;
and constitutional votes after Dobbs. Florida’s 2024 six-week implementation and
Amendment 4 vote are separate entries: 57.17% support did not meet the 60%
constitutional threshold. Missouri’s 2024 vote does not imply immediate clinic
reopening or make claims about later litigation or ballot measures. This is a
selected historical chronology, rather than a complete catalogue of fifty state
legal histories.

US sources are official state and federal records: original statutes and
judgments, state archives, legislative histories and nonpartisan ballot analyses,
certified election results, FDA approval records and government implementation
announcements. Supplemental references, including a scholarly Miami Law Review
analysis of Florida’s vote, are retained in the review ledger.

## Sources

Sources are original legislation and judgments, legislatures and courts,
government and national archives, the UN and its agencies, the African Union,
the OAS, national libraries and museums, and scholarly university publications.
The ancient contract is British Museum collection content hosted by Google Arts
& Culture. The UCL repository provides a scholarly history of the three Soviet
abortion-policy changes. No Wikipedia fallback is shown in women’s rights readers;
related-history cards in those readers use their recorded independent sources.

The exact summaries and review references are retained in
[the review ledger](history-event-corrections.json). The inventory links each
milestone’s source; these support its date and principal subject, not an assertion
that every aspect of a country’s legal history has been exhaustively reviewed.

## Validation

`node --test tests/*.test.cjs` covers source provenance, reviewed summaries,
worldwide and early-history coverage, stable IDs, scoped suffrage and abortion
claims, emoji selection, saved category state and separation from Layers.
`node tests/history-womens-rights.browser.mjs` checks chronology, search aliases,
combined topic/region filters, empty searches, trusted-source readers, keyboard
opening/dismissal, last-category visibility, saved views, map selection and
comparison dates. It checks the four map controls and reachable results from
320-pixel phones to desktop, including short landscape viewports.

The preview builder embeds the new module and styles. Exports preserve the
`rightsContext` topic and country fields; women’s rights records use their
independent source links and have a null `wikipediaUrl`.

Final verification: 102 Node tests, both Python geometry tests, the generated
country-data check, all 19 served browser suites and all 46 offline preview checks
pass. The dedicated women’s rights browser suite also passes against the offline
preview. The integrity audit reports no errors for 422 events, and the complete
bilingual site builds with CI’s Hugo 0.110.0.

The subsequent code review adds global-search country and abortion aliases,
preserves catalogue scroll/focus across timeline changes, and checks short
desktop windows at 1440×400, 900×400 and 1280×450. See
[the review findings](history-code-review.md#womens-rights-code-review).

## Milestone inventory

| ID | Date | Milestone | Context | Topic | Source |
| --- | --- | --- | --- | --- | --- |
| e346 | 172 BC | Egyptian marriage contract records financial protections | Egypt | Equality, property & family | [Reference](https://artsandculture.google.com/asset/papyrus-marriage-contract-between-the-priest-pagosh-and-teteimhotep/rwGBVTtjvcbJWg) |
| e347 | 1215 | Magna Carta addresses widows’ property and remarriage | England | Equality, property & family | [Reference](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_08) |
| e348 | c. 1405 | Christine de Pizan writes The Book of the City of Ladies | France | Movements & advocacy | [Reference](https://expositions.bnf.fr/brouillons/grand/3.htm) |
| e349 | 1791 | Olympe de Gouges demands equal citizenship for women | France | Movements & advocacy | [Reference](https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/revolution-francaise/declaration-des-droits-de-la-femme-et-de-la-citoyenne-olympe-de-gouges) |
| e350 | 1792 | Mary Wollstonecraft argues for women’s equal education | Britain | Education | [Reference](https://americanhistory.si.edu/collections/object/nmah_1835346) |
| e351 | 1848 | Savitribai and Jyotirao Phule open a girls’ school in Pune | India | Education | [Reference](https://www.ncert.nic.in/dgs/pdf/KGBV-HistoryENGLISH.pdf) |
| e352 | 1848 | Seneca Falls convention adopts the Declaration of Sentiments | United States | Movements & advocacy | [Reference](https://www.nps.gov/articles/declaration-of-sentiments-the-first-women-s-rights-convention.htm) |
| e399 | 1873 | The US Comstock Act restricts mailing abortion and contraceptive materials | United States | Abortion & reproductive rights | [Reference](https://www.justice.gov/olc/opinion/file/1560596/dl) |
| e353 | 1878 | University of London opens its degrees to women | Britain | Education | [Reference](https://archives.libraries.london.ac.uk/resources/1912historicalrecord.pdf) |
| e354 | 1882 | Married women gain wider control of property under English law | Britain and Ireland | Equality, property & family | [Reference](https://www.legislation.gov.uk/ukpga/Vict/45-46/75/enacted) |
| e123 | 1893 | New Zealand women vote | New Zealand | Voting & representation | [Reference](https://nzhistory.govt.nz/politics/womens-suffrage) |
| e355 | 1900 | Tsuda Umeko establishes a higher-education school for women | Japan | Education | [Reference](https://www.tsuda.ac.jp/en/profile.html) |
| e356 | 1902 | Australian federal suffrage expands with racial exclusions | Australia | Voting & representation | [Reference](https://peo.gov.au/understand-our-parliament/history-of-parliament/history-milestones/australian-parliament-history-timeline/events/commonwealth-franchise-act-1902) |
| e357 | 1906 | Finland grants women the vote and eligibility for parliament | Finland | Voting & representation | [Reference](https://finland.fi/life-society/finlands-parliament-pioneer-of-gender-equality/) |
| e396 | 1917 | Russian women win voting rights before the Bolshevik takeover | Russia | Voting & representation | [Reference](https://www.cambridge.org/core/journals/slavic-review/article/women-and-gender-in-1917/CE4673AE59CA42774E510225CACAC405) |
| e358 | 1918 | Britain grants parliamentary votes to some women | United Kingdom | Voting & representation | [Reference](https://www.parliament.uk/about/living-heritage/transformingsociety/electionsvoting/womenvote/overview/thevote/) |
| e359 | 1920 | The US Nineteenth Amendment bars sex-based voting exclusion | United States | Voting & representation | [Reference](https://www.archives.gov/milestone-documents/19th-amendment) |
| e379 | 1920 | Soviet Russia permits abortion in public hospitals | Soviet Russia | Abortion & reproductive rights | [Reference](https://discovery.ucl.ac.uk/id/eprint/10086847/) |
| e360 | 1928 | Britain establishes equal voting terms for women and men | United Kingdom | Voting & representation | [Reference](https://www.parliament.uk/about/living-heritage/transformingsociety/electionsvoting/womenvote/case-studies-women-parliament/what-difference/the-vote-for-some/) |
| e361 | 1929 | Ecuador’s constitution recognizes women’s voting rights | Ecuador | Voting & representation | [Reference](https://data.ipu.org/parliament/EC/EC-LC01/elections/historical-data-on-women/) |
| e362 | 1932 | Brazil’s electoral code recognizes women as voters | Brazil | Voting & representation | [Reference](https://www.tse.jus.br/servicos-eleitorais/glossario/termos/voto-da-mulher) |
| e363 | 1934 | Türkiye grants women parliamentary voting and candidacy rights | Türkiye | Voting & representation | [Reference](https://www.tihek.gov.tr/5-aralik-kadin-haklari-gunune-iliskin--basin-aciklamasi) |
| e380 | 1936 | The Soviet government severely restricts abortion | Soviet Union | Abortion & reproductive rights | [Reference](https://discovery.ucl.ac.uk/id/eprint/10086847/) |
| e364 | 1944 | France recognizes women’s right to vote and stand for election | France · ordinance issued in Algeria | Voting & representation | [Reference](https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/deuxieme-guerre-mondiale/l-accession-des-femmes-au-droit-de-vote) |
| e365 | 1945 | Japan’s electoral reform enfranchises women | Japan | Voting & representation | [Reference](https://www.archives.go.jp/learning/archive_collection_2/) |
| e366 | 1950 | India’s constitution establishes universal adult suffrage | India | Voting & representation | [Reference](https://data.ipu.org/parliament/IN/IN-LC01/elections/historical-data-on-women/) |
| e397 | 1950 | China’s Marriage Law recognizes free choice and easier divorce | China | Equality, property & family | [Reference](https://www.jstor.org/stable/jj.2711550) |
| e381 | 1955 | The Soviet Union re-legalizes abortion | Soviet Union | Abortion & reproductive rights | [Reference](https://discovery.ucl.ac.uk/id/eprint/10086847/) |
| e367 | 1956 | Egypt recognizes women’s national political rights | Egypt | Voting & representation | [Reference](https://knowledge.unwomen.org/sites/default/files/Headquarters/Attachments/Sections/Library/Publications/2011/ProgressOfTheWorldsWomen-2011-en.pdf) |
| e368 | 1956 | Tunisia adopts the Code of Personal Status | Tunisia | Equality, property & family | [Reference](https://www.justice.gov.tn/index.php?L=3&id=436) |
| e369 | 1956 | South African women march against apartheid pass laws | South Africa | Movements & advocacy | [Reference](https://www.gov.za/news/events/commemorative-events/womens-day) |
| e382 | 1967 | Britain passes the Abortion Act | Great Britain | Abortion & reproductive rights | [Reference](https://www.legislation.gov.uk/ukpga/1967/87/enacted) |
| e400 | 1967 | Colorado expands the circumstances permitting abortion | United States · Colorado | Abortion & reproductive rights | [Reference](https://content.leg.colorado.gov/sites/default/files/images/2023-2024_89vbb.pdf) |
| e401 | 1970 | Hawaii reforms abortion law before Roe | United States · Hawaii | Abortion & reproductive rights | [Reference](https://data.capitol.hawaii.gov/sessions/sessionlaws/Years/SLH1970/SLH1970_Act1.pdf) |
| e402 | 1970 | New York legalizes abortion before Roe | United States · New York | Abortion & reproductive rights | [Reference](https://nyassembly.gov/write/upload/postings/2017/pdfs/20171215_0078563.pdf) |
| e403 | 1970 | Washington voters approve abortion reform in Referendum 20 | United States · Washington | Abortion & reproductive rights | [Reference](https://www2.sos.wa.gov/legacy/images/publications/sl_voterspamphlet_1970_eastern/sl_voterspamphlet_1970_eastern.pdf) |
| e383 | 1971 | India adopts the Medical Termination of Pregnancy Act | India | Abortion & reproductive rights | [Reference](https://www.indiacode.nic.in/bitstream/123456789/1593/1/197134.pdf) |
| e384 | 1973 | Roe v. Wade recognizes a US constitutional abortion protection | United States | Abortion & reproductive rights | [Reference](https://tile.loc.gov/storage-services/service/ll/usrep/usrep410/usrep410113/usrep410113.pdf) |
| e398 | 1973 | Tunisia broadens legal access to abortion | Tunisia | Abortion & reproductive rights | [Reference](https://www.un.org/development/desa/pd/sites/www.un.org.development.desa.pd/files/files/documents/2020/Jan/un_1995_abortion_policies_-_a_global_review_-_volume_iii_oman_to_zimbabwe.pdf) |
| e385 | 1975 | France enacts the Veil abortion law | France | Abortion & reproductive rights | [Reference](https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006068506/) |
| e404 | 1976 | The Hyde Amendment restricts federal abortion funding | United States | Abortion & reproductive rights | [Reference](https://www.govinfo.gov/content/pkg/USREPORTS-448/pdf/USREPORTS-448-297.pdf) |
| e370 | 1979 | The UN adopts CEDAW, the women’s rights convention | Global · United Nations, New York | Equality, property & family | [Reference](https://legal.un.org/avl/ha/cedaw/cedaw.html) |
| e405 | 1980 | Harris v. McRae upholds the Hyde funding restriction | United States | Abortion & reproductive rights | [Reference](https://www.govinfo.gov/content/pkg/USREPORTS-448/pdf/USREPORTS-448-297.pdf) |
| e386 | 1988 | Canada’s Supreme Court strikes down the abortion provision | Canada | Abortion & reproductive rights | [Reference](https://www.publications.gc.ca/Collection-R/LoPBdP/CIR/8910-e.htm) |
| e406 | 1992 | Casey preserves abortion protection but changes the legal test | United States | Abortion & reproductive rights | [Reference](https://tile.loc.gov/storage-services/service/ll/usrep/usrep505/usrep505833/usrep505833.pdf) |
| e371 | 1994 | The Belém do Pará Convention addresses violence against women | Americas · adopted in Brazil | Freedom from violence | [Reference](https://www.oas.org/en/mesecvi/convention.asp) |
| e407 | 1994 | The FACE Act protects access to reproductive-health facilities | United States | Abortion & reproductive rights | [Reference](https://www.justice.gov/archives/reproductive-rights/what-we-are-doing) |
| e372 | 1995 | The Beijing conference adopts a global platform for women’s rights | Global · Beijing, China | Movements & advocacy | [Reference](https://www.un.org/conferences/women/beijing1995) |
| e387 | 1996 | South Africa adopts the Choice on Termination of Pregnancy Act | South Africa | Abortion & reproductive rights | [Reference](https://www.parliament.gov.za/storage/app/media/Acts/1996/Act_92_of_1996_Choice_on_Termination_of_Pregnancy_Act.pdf) |
| e373 | 2000 | UN resolution 1325 recognizes women’s role in peace and security | Global · United Nations, New York | Equality, property & family | [Reference](https://www.un.org/womenwatch/osagi/wps/) |
| e408 | 2000 | The FDA first approves mifepristone for medication abortion | United States | Abortion & reproductive rights | [Reference](https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/questions-and-answers-mifepristone-medical-termination-pregnancy-through-ten-weeks-gestation) |
| e388 | 2002 | Nepal reforms its abortion law | Nepal | Abortion & reproductive rights | [Reference](https://asiapacific.unfpa.org/sites/default/files/pub-pdf/final_draft_young_people_and_the_law_report_case_studies-01.pdf) |
| e374 | 2003 | The African Union adopts the Maputo Protocol | Africa · adopted in Mozambique | Abortion & reproductive rights | [Reference](https://au.int/sites/default/files/treaties/37077-treaty-charter_on_rights_of_women_in_africa.pdf) |
| e375 | 2006 | Ellen Johnson Sirleaf takes office as Liberia’s president | Liberia | Voting & representation | [Reference](https://www.un.org/sg/en/content/former-secretary-general/statements/2006-01-16/statement-the-secretary-general-the-inauguration-of-the-president-of-liberia) |
| e376 | 2011 | Kenya enacts the Prohibition of Female Genital Mutilation Act | Kenya | Freedom from violence | [Reference](https://www.kenyalaw.org/kl/fileadmin/pdfdownloads/Acts/ProhibitionofFemaleGenitalMutilationAct_No32of2011.pdf) |
| e377 | 2018 | Saudi Arabia lifts the ban on women driving | Saudi Arabia | Equality, property & family | [Reference](https://www.un.org/sg/en/content/sg/statements/2018-06-24/statement-attributable-the-spokesman-for-the-secretary-general-saudi-arabia) |
| e389 | 2018 | Ireland votes to repeal the Eighth Amendment | Ireland | Abortion & reproductive rights | [Reference](https://www.electoralcommission.ie/previous-referendums/) |
| e409 | 2019 | New York enacts the Reproductive Health Act | United States · New York | Abortion & reproductive rights | [Reference](https://www.nysenate.gov/legislation/bills/2019/S240) |
| e390 | 2020 | New Zealand adopts abortion law reform | New Zealand | Abortion & reproductive rights | [Reference](https://www.legislation.govt.nz/act/public/2020/6/en/latest/) |
| e391 | 2020 | Argentina’s Congress approves abortion access legislation | Argentina | Abortion & reproductive rights | [Reference](https://www.argentina.gob.ar/normativa/nacional/ley-27610-2020-346231) |
| e392 | 2021 | Mexico’s Supreme Court invalidates Coahuila’s abortion criminalization | Mexico | Abortion & reproductive rights | [Reference](https://www.internet2.scjn.gob.mx/red2/comunicados/noticia.asp?id=6579) |
| e410 | 2021 | Texas SB 8 restricts abortion through private civil enforcement | United States · Texas | Abortion & reproductive rights | [Reference](https://capitol.texas.gov/billlookup/BillSummary.aspx?Bill=SB8&LegSess=87R) |
| e378 | 2022 | Taliban authorities exclude women from Afghan universities | Afghanistan | Education | [Reference](https://afghanistan.un.org/en/212740-un-afghanistan-condemns-taliban-decision-suspend-women-universities-and-calls-its-immediate) |
| e393 | 2022 | Colombia’s Constitutional Court limits abortion criminalization | Colombia | Abortion & reproductive rights | [Reference](https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=195148) |
| e394 | 2022 | Dobbs overturns Roe and Casey’s US abortion protection | United States | Abortion & reproductive rights | [Reference](https://www.supremecourt.gov/opinions/21pdf/19-1392_6j37.pdf) |
| e411 | 2022 | Texas’s trigger abortion prohibition takes effect | United States · Texas | Abortion & reproductive rights | [Reference](https://www.sll.texas.gov/faqs/texas-trigger-law/) |
| e412 | 2022 | California voters add reproductive freedom to the state constitution | United States · California | Abortion & reproductive rights | [Reference](https://elections.cdn.sos.ca.gov/sov/2022-general/sov/complete.pdf) |
| e413 | 2022 | Kansas voters reject the Value Them Both amendment | United States · Kansas | Abortion & reproductive rights | [Reference](https://www.kansashistory.gov/archives/512066) |
| e414 | 2022 | Michigan voters approve the reproductive-freedom amendment | United States · Michigan | Abortion & reproductive rights | [Reference](https://www.michigan.gov/whitmer/news/press-releases/2022/12/14/governor-whitmer-signs-executive-directive-affirming-reproductive-freedoms) |
| e415 | 2023 | Ohio adds a constitutional right to reproductive decisions | United States · Ohio | Abortion & reproductive rights | [Reference](https://codes.ohio.gov/ohio-constitution/section-1.22) |
| e395 | 2024 | France constitutionally guarantees freedom to have an abortion | France | Abortion & reproductive rights | [Reference](https://www.conseil-etat.fr/en/content/download/217795/document/CE-RA23-Web_EN%20BD_link.pdf) |
| e416 | 2024 | Arizona voters approve a constitutional abortion right | United States · Arizona | Abortion & reproductive rights | [Reference](https://apps.azsos.gov/election/2024/bm/Proclamation_for_Prop_139.pdf) |
| e417 | 2024 | Florida’s six-week abortion restriction takes effect | United States · Florida | Abortion & reproductive rights | [Reference](https://flrules.org/Gateway/View_notice.asp?id=28322174) |
| e418 | 2024 | Florida’s abortion-rights amendment falls short of the approval threshold | United States · Florida | Abortion & reproductive rights | [Reference](https://results.elections.myflorida.com/DetailRpt.Asp?ELECTIONDATE=11%2F5%2F2024&RACE=A04) |
| e419 | 2024 | Colorado voters adopt a constitutional right to abortion | United States · Colorado | Abortion & reproductive rights | [Reference](https://historicalelectiondata.coloradosos.gov/contest/26545) |
| e420 | 2024 | Missouri voters approve a reproductive-freedom amendment | United States · Missouri | Abortion & reproductive rights | [Reference](https://www.sos.mo.gov/CMSImages/ElectionResultsStatistics/2024GeneralElection.pdf) |
