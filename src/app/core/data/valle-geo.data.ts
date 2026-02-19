// src/app/core/data/valle-geo.data.ts
// Centroids de los 42 municipios del Valle del Cauca + "Todo el Valle"
// Coordenadas: [lat, lng]

export interface MunicipioCentroid {
    name: string;
    lat: number;
    lng: number;
}

export const VALLE_CENTROIDS: MunicipioCentroid[] = [
    { name: 'Todo el Valle del Cauca', lat: 3.8, lng: -76.5 },
    { name: 'Alcalá', lat: 4.6767, lng: -75.7722 },
    { name: 'Andalucía', lat: 4.1522, lng: -76.1633 },
    { name: 'Ansermanuevo', lat: 4.7964, lng: -75.9869 },
    { name: 'Argelia', lat: 4.0656, lng: -76.1433 },
    { name: 'Bolívar', lat: 4.3378, lng: -76.2275 },
    { name: 'Buenaventura', lat: 3.8803, lng: -77.0311 },
    { name: 'Buga', lat: 3.9003, lng: -76.2994 },
    { name: 'Bugalagrande', lat: 4.2086, lng: -76.1586 },
    { name: 'Caicedonia', lat: 4.3322, lng: -75.8311 },
    { name: 'Cali', lat: 3.4516, lng: -76.5319 },
    { name: 'Calima (El Darién)', lat: 3.9422, lng: -76.4953 },
    { name: 'Candelaria', lat: 3.4086, lng: -76.3469 },
    { name: 'Cartago', lat: 4.7461, lng: -75.9125 },
    { name: 'Dagua', lat: 3.6533, lng: -76.6939 },
    { name: 'El Águila', lat: 4.9053, lng: -76.0644 },
    { name: 'El Cairo', lat: 4.9311, lng: -76.2467 },
    { name: 'El Cerrito', lat: 3.6897, lng: -76.2992 },
    { name: 'El Dovio', lat: 4.5172, lng: -76.2325 },
    { name: 'Florida', lat: 3.3264, lng: -76.2378 },
    { name: 'Ginebra', lat: 3.7361, lng: -76.2658 },
    { name: 'Guacarí', lat: 3.7786, lng: -76.3358 },
    { name: 'Jamundí', lat: 3.2597, lng: -76.5383 },
    { name: 'La Cumbre', lat: 3.6522, lng: -76.5664 },
    { name: 'La Unión', lat: 4.5333, lng: -76.1019 },
    { name: 'La Victoria', lat: 4.5272, lng: -75.9011 },
    { name: 'Obando', lat: 4.5742, lng: -75.9808 },
    { name: 'Palmira', lat: 3.5394, lng: -76.3033 },
    { name: 'Pradera', lat: 3.4181, lng: -76.2397 },
    { name: 'Restrepo', lat: 3.8183, lng: -76.5286 },
    { name: 'Riofrío', lat: 3.9028, lng: -76.3619 },
    { name: 'Roldanillo', lat: 4.4114, lng: -76.1567 },
    { name: 'San Pedro', lat: 3.9578, lng: -76.4022 },
    { name: 'Sevilla', lat: 4.2686, lng: -75.9361 },
    { name: 'Toro', lat: 4.5989, lng: -76.0822 },
    { name: 'Trujillo', lat: 4.2369, lng: -76.3278 },
    { name: 'Tuluá', lat: 4.0844, lng: -76.1997 },
    { name: 'Ulloa', lat: 4.7108, lng: -75.7767 },
    { name: 'Versalles', lat: 4.5694, lng: -76.2331 },
    { name: 'Vijes', lat: 3.7150, lng: -76.4478 },
    { name: 'Yotoco', lat: 3.8653, lng: -76.3967 },
    { name: 'Yumbo', lat: 3.5883, lng: -76.4953 },
    { name: 'Zarzal', lat: 4.3917, lng: -75.9894 },
];

/** Normaliza un nombre de municipio para comparación (sin tildes, lowercase) */
export function normalizeMunicipio(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/** Busca el centroid que corresponde a un intervention_location */
export function findCentroid(location: string): MunicipioCentroid | null {
    const normalized = normalizeMunicipio(location);
    return (
        VALLE_CENTROIDS.find(m => normalizeMunicipio(m.name) === normalized) ?? null
    );
}