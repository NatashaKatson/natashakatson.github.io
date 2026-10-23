# Ancient continent snapshots

Source: **Scotese, C.R. (2016). PALEOMAP PaleoAtlas for GPlates and the
PaleoData Plotter Program. PALEOMAP Project.**

- Model documentation: https://gwsdoc.gplates.org/models/#paleomap
- Original resource: https://www.earthbyte.org/paleomap-paleoatlas-for-gplates/
- Dataset record: https://doi.org/10.5281/zenodo.10596610
- Coastline endpoint: https://gwsdoc.gplates.org/reconstruction/reconstruct-coastlines/
- Point endpoint: https://gwsdoc.gplates.org/reconstruction/reconstruct-points/

These GeoJSON files are derived from GPlates Web Service requests with the model
explicitly set to `PALEOMAP`, anchor plate 0. `snapshots.js` records the retrieval
date, snapshot ages, small overview land layers and matching reconstructed
coordinates for the atlas's eight representative fossil regions. Land and points
always use the same model and age.

There are 34 snapshots spanning 1–252 Ma, with a maximum interval of 10 Ma and
additional ages for dinosaur destinations. The atlas selects the nearest snapshot,
labels its age, and does not interpolate land polygons. Triassic, Jurassic and
Cretaceous destinations use 228, 150 and 67 Ma respectively. Deep-time map years
older than 1 Ma use these reconstructions; later years use the existing map.

Continental outlines show plate reconstruction, with simplified geometry. They do
not resolve changing local shorelines, inland seas, topography or sea levels.
Fossil points reconstruct representative present-day regions rather than exact
quarries or species ranges. Age, position and continental geometry are approximate.

Regenerate from the repository root with:

```sh
python3 scripts/build-history-paleogeography.py
```

The builder caches raw responses in the system temporary directory, simplifies
rings in unit-sphere coordinates, rounds to three decimals and normalizes mixed
source winding for D3's spherical polygon convention. Overview rings use coarser
simplification, two decimals, and omit islands smaller than 0.00005 steradians.
The bundled overviews add about 0.5 MB gzipped and provide immediate land for every
snapshot, without downloading detailed maps while the slider moves.

Detailed coastlines load after the displayed snapshot ages settle for 150 ms.
Comparison sides settle together. A failed or slow detail request leaves the
matching overview visible, and the map note offers a retry. Returning to human
history cancels any scheduled ancient detail request. Requests to GPlates are
needed only when regenerating; the site serves all reconstruction data locally.
