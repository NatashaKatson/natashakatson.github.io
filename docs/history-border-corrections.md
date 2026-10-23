# Historical border corrections

The Cliopatria snapshots in `atlas/borders/c1975.json` and `c2000.json`
contained a three-polygon feature named **Russian-occupied territories**, dated
1992–2024 and assigned to **Russian Federation**. Its polygons are in South
Ossetia, southern Moldova (Gagauzia), and Transnistria. None are in Ukraine.
The generic name made hovering beside southwestern Ukraine look like a misplaced
map of the occupation of Ukraine. The sovereignty relationship was also wrong.

`scripts/correct-history-borders.py` splits this aggregate using its existing
polygon rings, retaining the source's simplified outlines and coverage dates:

| Region | Country relationship shown |
| --- | --- |
| Transnistria | Republic of Moldova |
| Gagauzia | Republic of Moldova |
| South Ossetia | Georgia |

These relationships describe internationally recognized territory; they do not
assert effective government control or a particular autonomy status throughout
the interval. The source's Russia realm envelopes also included these regions.
The correction uses each envelope's corresponding Russia feature to exclude
them. Areas and label anchors are adjusted; TopoJSON arcs are unchanged.

## Additional dated corrections

The same script applies the following source-backed corrections. Transition
years are annual snapshots, not day-level assertions of sovereignty or control.

- **France:** remove Algeria from 1962 and Djibouti from 1977, using their
  disjoint source components. See the [UN's list of former territories](https://www.un.org/dppa/decolonization/fr/history/former-trust-and-nsgts).
- **United Kingdom:** correct the post-1801 name and remove the independent
  Gulf components from 1971. Sources: [UK Parliament on the Union](https://www.parliament.uk/about/living-heritage/evolutionofparliament/legislativescrutiny/parliamentandireland/collections/ireland/act-of-union-1800/),
  [Bahrain](https://history.state.gov/countries/bahrain),
  [Qatar](https://history.state.gov/countries/qatar) and
  [UAE](https://history.state.gov/countries/united-arab-emirates).
  The source's 1969–2023 UK record retained a large UAE/Oman component and the
  smaller Qatar and Bahrain components. The post-1971 record excludes these
  components, has its label anchor in Britain, and drops its obsolete British
  Empire membership. This does not independently validate the pre-1971 record.
- **Dutch territories:** separate continental Suriname from the Netherlands
  Antilles geometry, recognize the existing independent Suriname record from
  1975, and replace the Antilles name after its dissolution in 2010. Sources:
  [Suriname's independence](https://history.state.gov/countries/suriname) and
  [the Dutch government's Caribbean overview](https://www.government.nl/themes/government-and-democracy/caribbean-parts-of-the-kingdom).
- **Mali:** the source's post-1960 Mali Federation record becomes Republic of
  Mali. See [Mali's UN application of September 1960](https://digitallibrary.un.org/record/620443).
- **Denmark:** source records after the 1814 breakup are Denmark. See
  [Norway's Parliament on the Treaty of Kiel](https://stortinget.no/no/Stortinget-og-demokratiet/Grunnloven/grunnloven-18142014/Kieltraktaten-av-14-januar-1814/).
- **Portugal and Angola:** end the Estado Novo name in 1974, identify the later
  Cabinda-only source versions under Angola, and apply Republic of Angola from
  1992. Sources: [Portuguese Parliament](https://www.parlamento.pt/Parlamento/paginas/democracia.aspx),
  [UN decolonization records](https://www.un.org/dppa/decolonization/fr/history/former-trust-and-nsgts)
  and [UN terminology effective in 1992](https://digitallibrary.un.org/record/114431/files/ST_CS_SER-F_342-EN.pdf).
- **North Macedonia and Germany:** apply the 2019 North Macedonia name and
  correct Federal Republic of Germany. Sources: [UN member-state history](https://www.un.org/en/about-us/member-states/yugoslavia)
  and [the Bundestag](https://www.bundestag.de/en/parliament/history/parliamentarism/frg_parliamentarism).
- **Unidentified Syrian groups:** explicitly flag the generic “Mujahideen”
  source identity as unverified. Preserve its provenance instead of inventing
  a group identity or front line. See the
  [source dataset](https://github.com/Seshat-Global-History-Databank/cliopatria).

The constant-latitude rendering correction is described in the
[accuracy review](history-accuracy-review.md). It adds intermediate GeoJSON
vertices at load time, while preserving the archive's TopoJSON arcs.

Sources for these corrections:

- [OSCE Mission to Moldova](https://moldova.osce.org/): a settlement based on
  Moldova's territorial integrity with special status for Transdniestria.
- [Gagauzia's administration](https://www.gagauzia.md/en/administracziya-regiona/):
  the autonomous territorial unit is part of the Republic of Moldova.
- [OSCE statement on South Ossetia and Abkhazia](https://www.osce.org/cio/50011):
  Georgia's sovereignty and territorial integrity.

## Crimea from 2014

The source incorrectly includes the Crimea polygon in both Russia's state and
realm geometries from 2014. The correction removes that polygon from both and
retains it in Ukraine's internationally recognized territory, including the
2024 snapshot where the source omitted it from Ukraine. A separate feature,
**Crimea (occupied by Russia)**, belongs to **Ukraine**, dated 2014–2024. Hover,
search, selection and shared views use that identity. The detail panel explains
the occupation and links to the UN resolution. The existing source ring is
reused; no new boundary coordinates are drawn. The label applies to the annual
2014 snapshot, without claiming that occupation began on 1 January.

Sources: [UNGA 68/262](https://digitallibrary.un.org/record/767883), affirming
Ukraine's territorial integrity and rejecting the validity of the Crimea
referendum, and [UNGA 76/70](https://mandates.un.org/mandate/A/RES/76/70), which
identifies Russia as the occupying power and calls for an end to the occupation.

This correction does not reconstruct the wider Ukraine front line. The source ends in
2024, carried forward to 2026 by the atlas; it does not provide a current front
line. Other source claims, overlaps and simplification errors remain possible.
Ukraine's occupied territory includes Crimea and areas in the east and south;
see [the UN's report covering July–December 2025](https://ukraine.ohchr.org/en/Situation-of-human-rights-in-the-temporarily-occupied-territories-of-Ukraine-including-the-Autonomous-Republic-of-Crimea-and-the-city-of-Sevastopol-report-of-the-Secretary-General-1-July-31-December-2025).

After importing original snapshots, apply the correction and regenerate the
state search index so search and map inspection agree:

```sh
python3 scripts/correct-history-borders.py
python3 scripts/build-history-search.py
node --test tests/history-borders.test.cjs tests/history-discovery.test.cjs
```
