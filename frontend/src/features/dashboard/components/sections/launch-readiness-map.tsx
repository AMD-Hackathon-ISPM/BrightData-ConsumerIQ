import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";
import {
  Layer,
  Map as MapGL,
  Popup,
  Source,
  type LayerProps,
  type MapEvent,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "react-map-gl/maplibre";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopologyUrl from "world-atlas/countries-110m.json?url";
import { cn } from "@/lib/utils";

type CountryReadinessDatum = {
  country: string;
  countryId: string;
  readinessScore: number;
  demandIndex: number;
  competitorPressure: number;
  personaFit: number;
  primaryChannel: string;
  signal: string;
};

type WorldCountryProperties = {
  name?: string;
};

type CountryMapProperties = WorldCountryProperties &
  Partial<CountryReadinessDatum> & {
    countryId: string;
    hasReadiness: boolean;
    name: string;
  };

type CountryFeatureCollection = FeatureCollection<Geometry, CountryMapProperties>;
type LandFeatureCollection = FeatureCollection<Geometry, WorldCountryProperties>;
type LaunchMapData = {
  land: LandFeatureCollection;
  readinessCountries: CountryFeatureCollection;
};

type CountriesTopology = Topology<{
  countries: GeometryCollection<WorldCountryProperties>;
  land: GeometryCollection<WorldCountryProperties>;
}>;

type MapLoadState =
  | { status: "loading"; data: null }
  | { status: "ready"; data: LaunchMapData }
  | { status: "error"; data: null };

type HoveredCountry = CountryReadinessDatum & {
  latitude: number;
  longitude: number;
};

const LAND_SOURCE_ID = "launch-readiness-land";
const LAND_FILL_LAYER_ID = "launch-readiness-land-fill";
const COUNTRY_SOURCE_ID = "launch-readiness-countries";
const COUNTRY_FILL_LAYER_ID = "launch-readiness-country-fill";
const COUNTRY_HOVER_LAYER_ID = "launch-readiness-country-hover";
const MAP_PIXEL_RATIO =
  typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 1.5);

const FALLBACK_MAP_STYLE: StyleSpecification = {
  layers: [
    {
      id: "launch-readiness-background",
      paint: {
        "background-color": "#171717",
      },
      type: "background",
    },
  ],
  sources: {},
  version: 8,
};

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE_URL ?? FALLBACK_MAP_STYLE;

const launchReadinessData: CountryReadinessDatum[] = [
  {
    country: "United States",
    countryId: "840",
    readinessScore: 91,
    demandIndex: 132,
    competitorPressure: 58,
    personaFit: 68,
    primaryChannel: "Amazon",
    signal: "Best first market",
  },
  {
    country: "Canada",
    countryId: "124",
    readinessScore: 79,
    demandIndex: 106,
    competitorPressure: 54,
    personaFit: 62,
    primaryChannel: "Amazon",
    signal: "High intent",
  },
  {
    country: "Indonesia",
    countryId: "360",
    readinessScore: 76,
    demandIndex: 118,
    competitorPressure: 47,
    personaFit: 64,
    primaryChannel: "Temu",
    signal: "Expansion pocket",
  },
  {
    country: "Australia",
    countryId: "036",
    readinessScore: 72,
    demandIndex: 98,
    competitorPressure: 45,
    personaFit: 59,
    primaryChannel: "Amazon",
    signal: "Premium test market",
  },
  {
    country: "United Kingdom",
    countryId: "826",
    readinessScore: 69,
    demandIndex: 95,
    competitorPressure: 63,
    personaFit: 61,
    primaryChannel: "Amazon",
    signal: "Watchlist",
  },
  {
    country: "Germany",
    countryId: "276",
    readinessScore: 63,
    demandIndex: 87,
    competitorPressure: 66,
    personaFit: 57,
    primaryChannel: "Amazon",
    signal: "Watchlist",
  },
  {
    country: "Japan",
    countryId: "392",
    readinessScore: 58,
    demandIndex: 82,
    competitorPressure: 71,
    personaFit: 53,
    primaryChannel: "Amazon",
    signal: "Needs validation",
  },
  {
    country: "Singapore",
    countryId: "702",
    readinessScore: 54,
    demandIndex: 74,
    competitorPressure: 69,
    personaFit: 51,
    primaryChannel: "Amazon",
    signal: "Needs validation",
  },
];

const readinessByCountryId = new Map(
  launchReadinessData.map((datum) => [datum.countryId, datum]),
);

function ringCrossesAntimeridian(ring: Position[]) {
  for (let index = 1; index < ring.length; index += 1) {
    const previousLongitude = ring[index - 1]?.[0];
    const longitude = ring[index]?.[0];

    if (
      typeof previousLongitude === "number" &&
      typeof longitude === "number" &&
      Math.abs(longitude - previousLongitude) > 180
    ) {
      return true;
    }
  }

  return false;
}

function sanitizePolygonCoordinates(coordinates: Position[][]) {
  if (!coordinates[0] || ringCrossesAntimeridian(coordinates[0])) {
    return null;
  }

  return coordinates.filter(
    (ring, index) => index === 0 || !ringCrossesAntimeridian(ring),
  );
}

function sanitizeGeometry(geometry: Geometry): Geometry | null {
  if (geometry.type === "Polygon") {
    const coordinates = sanitizePolygonCoordinates(geometry.coordinates);

    return coordinates ? ({ ...geometry, coordinates } as Polygon) : null;
  }

  if (geometry.type === "MultiPolygon") {
    const coordinates = geometry.coordinates.flatMap((polygon) => {
      const sanitizedPolygon = sanitizePolygonCoordinates(polygon);

      return sanitizedPolygon ? [sanitizedPolygon] : [];
    });

    return coordinates.length
      ? ({ ...geometry, coordinates } as MultiPolygon)
      : null;
  }

  return geometry;
}

const landFillLayer: LayerProps = {
  id: LAND_FILL_LAYER_ID,
  type: "fill",
  paint: {
    "fill-antialias": false,
    "fill-color": "rgba(80, 73, 69, 0.22)",
    "fill-opacity": 0.55,
  },
};

const countryFillLayer: LayerProps = {
  id: COUNTRY_FILL_LAYER_ID,
  type: "fill",
  paint: {
    "fill-antialias": false,
    "fill-color": [
      "case",
      ["==", ["get", "hasReadiness"], true],
      [
        "interpolate",
        ["linear"],
        ["get", "readinessScore"],
        45,
        "#504945",
        60,
        "#d79921",
        75,
        "#458588",
        90,
        "#98971a",
      ],
      "rgba(124, 111, 100, 0.2)",
    ],
    "fill-opacity": [
      "case",
      ["==", ["get", "hasReadiness"], true],
      0.78,
      0.18,
    ],
  },
};

const statToneClass: Record<string, string> = {
  "Best first market": "text-[#98971a] dark:text-[#b8bb26]",
  "Expansion pocket": "text-chart-3",
  "High intent": "text-chart-5",
  "Needs validation": "text-muted-foreground",
  Watchlist: "text-warning",
};

export function LaunchReadinessMap() {
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>({
    data: null,
    status: "loading",
  });
  const [hoveredCountry, setHoveredCountry] = useState<HoveredCountry | null>(
    null,
  );
  const hoveredCountryIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCountries() {
      try {
        const response = await fetch(countriesTopologyUrl);

        if (!response.ok) {
          throw new Error("Unable to load country boundaries");
        }

        const topology = (await response.json()) as CountriesTopology;
        const countries = feature<WorldCountryProperties>(
          topology,
          topology.objects.countries,
        ) as FeatureCollection<Geometry, WorldCountryProperties>;
        const land: LandFeatureCollection = {
          ...countries,
          features: countries.features.flatMap((country) => {
            const countryId = String(country.id ?? "");
            const geometry = sanitizeGeometry(country.geometry);

            return countryId !== "010" && geometry
              ? [{ ...country, geometry }]
              : [];
          }),
        };
        const readinessCountries: CountryFeatureCollection = {
          ...countries,
          features: countries.features.flatMap((country) => {
            const countryId = String(country.id ?? "");
            const datum = readinessByCountryId.get(countryId);
            const geometry = sanitizeGeometry(country.geometry);

            if (!datum || !geometry) {
              return [];
            }

            return [
              {
                ...country,
                geometry,
                id: countryId,
                properties: {
                  ...country.properties,
                  ...datum,
                  countryId,
                  hasReadiness: true,
                  name: datum.country,
                },
              },
            ];
          }),
        };

        if (isMounted) {
          setMapLoadState({
            data: { land, readinessCountries },
            status: "ready",
          });
        }
      } catch {
        if (isMounted) {
          setMapLoadState({ data: null, status: "error" });
        }
      }
    }

    loadCountries();

    return () => {
      isMounted = false;
    };
  }, []);

  const hoverLayer = useMemo<LayerProps>(
    () => ({
      id: COUNTRY_HOVER_LAYER_ID,
      type: "fill",
      filter: [
        "==",
        ["get", "countryId"],
        hoveredCountry?.countryId ?? "__none__",
      ],
      paint: {
        "fill-antialias": false,
        "fill-color": "#fbf1c7",
        "fill-opacity": 0.2,
      },
    }),
    [hoveredCountry?.countryId],
  );

  function clearHoveredCountry(event: MapLayerMouseEvent) {
    event.target.getCanvas().style.cursor = "";

    if (hoveredCountryIdRef.current !== null) {
      hoveredCountryIdRef.current = null;
      setHoveredCountry(null);
    }
  }

  function handleMapLoad(event: MapEvent) {
    event.target.touchZoomRotate.disableRotation();
  }

  function handleMouseMove(event: MapLayerMouseEvent) {
    const featureProperties = event.features?.[0]?.properties as
      | Partial<CountryMapProperties>
      | undefined;
    const countryId = featureProperties?.countryId;
    const datum = countryId ? readinessByCountryId.get(countryId) : undefined;

    if (!countryId || !datum) {
      clearHoveredCountry(event);
      return;
    }

    event.target.getCanvas().style.cursor = "pointer";

    if (hoveredCountryIdRef.current === countryId) {
      return;
    }

    hoveredCountryIdRef.current = countryId;
    setHoveredCountry({
      ...datum,
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
    });
  }

  function handleMouseLeave(event: MapLayerMouseEvent) {
    clearHoveredCountry(event);
  }

  const topCountries = launchReadinessData.slice(0, 3);

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="break-words font-semibold">Market Readiness Map</h3>
          <p className="mt-1 max-w-3xl break-words text-sm text-muted-foreground">
            Country readiness by demand, persona fit, and competitor pressure
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 font-medium">
            <span className="size-2.5 rounded-full bg-[#98971a] dark:bg-[#b8bb26]" />
            Launch first
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 font-medium">
            <span className="size-2.5 rounded-full bg-chart-5" />
            High readiness
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 font-medium">
            <span className="size-2.5 rounded-full bg-warning" />
            Validate
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {topCountries.map((country) => (
          <div
            className="min-w-0 rounded-lg border bg-background-default p-3"
            key={country.countryId}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">
                  {country.country}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs font-medium",
                    statToneClass[country.signal] ?? "text-muted-foreground",
                  )}
                >
                  {country.signal}
                </p>
              </div>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {country.readinessScore}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="launch-readiness-map relative h-[24rem] min-h-[22rem] overflow-hidden rounded-lg border bg-background-default sm:h-[28rem] xl:h-[32rem]">
        {mapLoadState.status === "ready" ? (
          <MapGL
            attributionControl={{ compact: true }}
            dragPan
            dragRotate={false}
            fadeDuration={0}
            initialViewState={{
              latitude: 18,
              longitude: 12,
              zoom: 1.15,
            }}
            interactiveLayerIds={[COUNTRY_FILL_LAYER_ID]}
            mapStyle={MAP_STYLE}
            maxPitch={0}
            maxZoom={3.5}
            minZoom={1}
            onLoad={handleMapLoad}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            pitchWithRotate={false}
            pixelRatio={MAP_PIXEL_RATIO}
            renderWorldCopies={false}
            scrollZoom
            style={{ height: "100%", width: "100%" }}
            touchZoomRotate
          >
            <Source data={mapLoadState.data.land} id={LAND_SOURCE_ID} type="geojson">
              <Layer {...landFillLayer} />
            </Source>
            <Source
              data={mapLoadState.data.readinessCountries}
              id={COUNTRY_SOURCE_ID}
              type="geojson"
            >
              <Layer {...countryFillLayer} />
              <Layer {...hoverLayer} />
            </Source>
            {hoveredCountry ? (
              <Popup
                className="launch-readiness-popup"
                closeButton={false}
                closeOnClick={false}
                latitude={hoveredCountry.latitude}
                longitude={hoveredCountry.longitude}
                maxWidth="18rem"
                offset={12}
              >
                <div className="min-w-56 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{hoveredCountry.country}</p>
                      <p
                        className={cn(
                          "mt-1 text-xs font-medium",
                          statToneClass[hoveredCountry.signal] ??
                            "text-muted-foreground",
                        )}
                      >
                        {hoveredCountry.signal}
                      </p>
                    </div>
                    <p className="font-mono text-xl font-semibold tabular-nums">
                      {hoveredCountry.readinessScore}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-1.5 text-xs">
                    {[
                      ["Demand", hoveredCountry.demandIndex],
                      ["Competitor Pressure", hoveredCountry.competitorPressure],
                      ["Persona Fit", `${hoveredCountry.personaFit}%`],
                      ["Primary Channel", hoveredCountry.primaryChannel],
                    ].map(([label, value]) => (
                      <div
                        className="flex min-w-0 items-center justify-between gap-3"
                        key={label}
                      >
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            ) : null}
          </MapGL>
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
            {mapLoadState.status === "error"
              ? "Map data unavailable"
              : "Loading map"}
          </div>
        )}
      </div>
    </div>
  );
}
