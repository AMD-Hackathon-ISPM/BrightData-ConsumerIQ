import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { FeatureCollection, Geometry, Position } from "geojson";
import type { LngLat, TransformConstrainFunction } from "maplibre-gl";
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

type EnrichedCountryDatum = CountryReadinessDatum & {
  opportunityScore: number;
};

type WorldCountryProperties = {
  name?: string;
};

type CountryMapProperties = WorldCountryProperties &
  Partial<EnrichedCountryDatum> & {
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

type HoveredCountry = EnrichedCountryDatum & {
  latitude: number;
  longitude: number;
};

type MapMode = "demand" | "opportunity";
type LngLatConstructor = new (lng: number, lat: number) => LngLat;

const LAND_SOURCE_ID = "launch-readiness-land";
const LAND_FILL_LAYER_ID = "launch-readiness-land-fill";
const COUNTRY_OUTLINE_LAYER_ID = "launch-readiness-country-outline";
const COUNTRY_SOURCE_ID = "launch-readiness-countries";
const COUNTRY_FILL_LAYER_ID = "launch-readiness-country-fill";
const COUNTRY_HOVER_LAYER_ID = "launch-readiness-country-hover";
const MAP_PIXEL_RATIO =
  typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 1.5);
const MAP_MIN_CENTER_LATITUDE = 2;
const MAP_MAX_CENTER_LATITUDE = 55;
const MAP_MIN_ZOOM = 0.75;
const MAP_MAX_ZOOM = 3.5;

const constrainLaunchMapTransform: TransformConstrainFunction = (
  lngLat,
  zoom,
) => {
  const LngLatClass = lngLat.constructor as LngLatConstructor;
  const constrainedLatitude = Math.min(
    MAP_MAX_CENTER_LATITUDE,
    Math.max(MAP_MIN_CENTER_LATITUDE, lngLat.lat),
  );
  const constrainedZoom = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, zoom));

  return {
    center:
      constrainedLatitude === lngLat.lat
        ? lngLat
        : new LngLatClass(lngLat.lng, constrainedLatitude),
    zoom: constrainedZoom,
  };
};

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

const enrichedReadinessData: EnrichedCountryDatum[] = launchReadinessData.map(
  (datum) => ({
    ...datum,
    opportunityScore:
      Math.round(
        ((datum.demandIndex * datum.personaFit) / datum.competitorPressure) * 10,
      ) / 10,
  }),
);

const readinessByCountryId = new Map(
  enrichedReadinessData.map((datum) => [datum.countryId, datum]),
);

type ModeConfig = {
  label: string;
  metricKey: "demandIndex" | "opportunityScore";
  metricLabel: string;
  domain: [number, number, number, number, number];
  ramp: [string, string, string, string, string];
};

const MODE_CONFIG: Record<MapMode, ModeConfig> = {
  demand: {
    label: "Demand",
    metricKey: "demandIndex",
    metricLabel: "Demand index",
    domain: [70, 86, 102, 118, 135],
    ramp: ["#2a1d12", "#6b3f1a", "#b9690e", "#e08b1a", "#f5c156"],
  },
  opportunity: {
    label: "Opportunity",
    metricKey: "opportunityScore",
    metricLabel: "Opportunity score",
    domain: [55, 82, 110, 137, 165],
    ramp: ["#16261f", "#1f4a3a", "#2a7256", "#4a9d7a", "#7dc4a3"],
  },
};

const landFillLayer: LayerProps = {
  id: LAND_FILL_LAYER_ID,
  type: "fill",
  paint: {
    "fill-antialias": false,
    "fill-color": "rgba(80, 73, 69, 0.22)",
    "fill-opacity": 0.55,
  },
};

const countryOutlineLayer: LayerProps = {
  id: COUNTRY_OUTLINE_LAYER_ID,
  type: "line",
  paint: {
    "line-color": "rgba(180, 170, 160, 0.35)",
    "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 3.5, 0.9],
  },
};

function normalizeRing(ring: Position[]): Position[] {
  let crosses = false;
  for (let i = 1; i < ring.length; i += 1) {
    const prev = ring[i - 1]?.[0];
    const cur = ring[i]?.[0];
    if (
      typeof prev === "number" &&
      typeof cur === "number" &&
      Math.abs(cur - prev) > 180
    ) {
      crosses = true;
      break;
    }
  }
  if (!crosses) return ring;

  let positives = 0;
  let negatives = 0;
  for (const point of ring) {
    const lng = point?.[0];
    if (typeof lng !== "number") continue;
    if (lng > 0) positives += 1;
    else if (lng < 0) negatives += 1;
  }

  const shiftNegativesUp = positives >= negatives;
  return ring.map((point) => {
    const lng = point[0];
    if (typeof lng !== "number") return point;
    if (shiftNegativesUp && lng < 0) return [lng + 360, ...point.slice(1)] as Position;
    if (!shiftNegativesUp && lng > 0) return [lng - 360, ...point.slice(1)] as Position;
    return point;
  });
}

function normalizeGeometry(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") {
    return { ...geometry, coordinates: geometry.coordinates.map(normalizeRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map(normalizeRing),
      ),
    };
  }
  return geometry;
}

const statToneClass: Record<string, string> = {
  "Best first market": "text-[#98971a] dark:text-[#b8bb26]",
  "Expansion pocket": "text-chart-3",
  "High intent": "text-chart-5",
  "Needs validation": "text-foreground-light",
  Watchlist: "text-warning",
};

function formatMetricValue(mode: MapMode, datum: EnrichedCountryDatum): string {
  const value = datum[MODE_CONFIG[mode].metricKey];
  return mode === "opportunity"
    ? value.toFixed(1)
    : Math.round(value).toString();
}

export function LaunchReadinessMap() {
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>({
    data: null,
    status: "loading",
  });
  const [hoveredCountry, setHoveredCountry] = useState<HoveredCountry | null>(
    null,
  );
  const [mode, setMode] = useState<MapMode>("demand");
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
        const rawCountries = feature<WorldCountryProperties>(
          topology,
          topology.objects.countries,
        ) as FeatureCollection<Geometry, WorldCountryProperties>;
        const countries: FeatureCollection<Geometry, WorldCountryProperties> = {
          ...rawCountries,
          features: rawCountries.features.flatMap((country) => {
            const countryId = String(country.id ?? "");
            // Antarctica's polygon legitimately spans 360° at the antimeridian,
            // which causes broken edges across the rendered map even after
            // longitude normalization. The pre-existing implementation filtered
            // it out for the same reason.
            if (countryId === "010") return [];
            return [{ ...country, geometry: normalizeGeometry(country.geometry) }];
          }),
        };
        const land: LandFeatureCollection = {
          ...countries,
          features: countries.features,
        };
        const readinessCountries: CountryFeatureCollection = {
          ...countries,
          features: countries.features.flatMap((country) => {
            const countryId = String(country.id ?? "");
            const datum = readinessByCountryId.get(countryId);

            if (!datum) {
              return [];
            }

            return [
              {
                ...country,
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

  const countryFillLayer = useMemo<LayerProps>(() => {
    const config = MODE_CONFIG[mode];

    return {
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
            ["get", config.metricKey],
            config.domain[0],
            config.ramp[0],
            config.domain[1],
            config.ramp[1],
            config.domain[2],
            config.ramp[2],
            config.domain[3],
            config.ramp[3],
            config.domain[4],
            config.ramp[4],
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
  }, [mode]);

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

  const config = MODE_CONFIG[mode];
  const topCountries = useMemo(
    () =>
      [...enrichedReadinessData]
        .sort((a, b) => b[config.metricKey] - a[config.metricKey])
        .slice(0, 3),
    [config.metricKey],
  );

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="break-words font-semibold">Market Readiness Map</h3>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center rounded-full border bg-background-default p-0.5 text-[11px] font-medium"
            role="tablist"
          >
            {(Object.keys(MODE_CONFIG) as MapMode[]).map((key) => {
              const isActive = mode === key;
              return (
                <button
                  aria-pressed={isActive}
                  className={cn(
                    "relative rounded-full px-3 py-1 transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-foreground-light hover:text-foreground",
                  )}
                  key={key}
                  onClick={() => setMode(key)}
                  role="tab"
                  type="button"
                >
                  {isActive ? (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-background-200 shadow-sm ring-1 ring-inset ring-white/10"
                      layoutId="map-mode-active"
                      transition={{ bounce: 0.2, duration: 0.35, type: "spring" }}
                    />
                  ) : null}
                  <span className="relative z-10">
                    {MODE_CONFIG[key].label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-medium">
            <span className="text-foreground-light">
              {config.domain[0]}
            </span>
            <span
              aria-hidden
              className="h-2 w-24 rounded-full"
              style={{
                background: `linear-gradient(to right, ${config.ramp.join(", ")})`,
              }}
            />
            <span className="text-foreground-light">
              {config.domain[4]}
            </span>
          </div>
        </div>
      </div>

      <div className="launch-readiness-map relative h-[22rem] min-h-[22rem] overflow-hidden rounded-lg border bg-background-default sm:h-[26rem] xl:h-[30rem]">
        {mapLoadState.status === "ready" ? (
          <MapGL
            attributionControl={{ compact: true }}
            dragPan
            dragRotate={false}
            fadeDuration={0}
            initialViewState={{
              latitude: 22,
              longitude: 12,
              zoom: 1.25,
            }}
            interactiveLayerIds={[COUNTRY_FILL_LAYER_ID]}
            mapStyle={MAP_STYLE}
            maxPitch={0}
            maxZoom={MAP_MAX_ZOOM}
            minZoom={MAP_MIN_ZOOM}
            onLoad={handleMapLoad}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            pitchWithRotate={false}
            pixelRatio={MAP_PIXEL_RATIO}
            scrollZoom
            style={{ height: "100%", width: "100%" }}
            touchZoomRotate
            transformConstrain={constrainLaunchMapTransform}
          >
            <Source data={mapLoadState.data.land} id={LAND_SOURCE_ID} type="geojson">
              <Layer {...landFillLayer} />
              <Layer {...countryOutlineLayer} />
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
                            "text-foreground-light",
                        )}
                      >
                        {hoveredCountry.signal}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xl font-semibold tabular-nums">
                        {formatMetricValue(mode, hoveredCountry)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-foreground-light">
                        {config.metricLabel}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-1.5 text-xs">
                    {[
                      ["Demand", hoveredCountry.demandIndex],
                      ["Competitor Pressure", hoveredCountry.competitorPressure],
                      ["Persona Fit", `${hoveredCountry.personaFit}%`],
                      ["Opportunity", hoveredCountry.opportunityScore.toFixed(1)],
                      ["Primary Channel", hoveredCountry.primaryChannel],
                    ].map(([label, value]) => (
                      <div
                        className="flex min-w-0 items-center justify-between gap-3"
                        key={label}
                      >
                        <span className="text-foreground-light">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            ) : null}
          </MapGL>
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-sm text-foreground-light">
            {mapLoadState.status === "error"
              ? "Map data unavailable"
              : "Loading map"}
          </div>
        )}
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
                    statToneClass[country.signal] ?? "text-foreground-light",
                  )}
                >
                  {country.signal}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatMetricValue(mode, country)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-foreground-light">
                  {config.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
