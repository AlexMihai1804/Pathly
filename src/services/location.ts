/**
 * Represents a geographical location with latitude and longitude coordinates.
 */
export interface Location {
  /**
   * The latitude of the location.
   */
  lat: number;
  /**
   * The longitude of the location.
   */
  lng: number;
}

/**
 * Represents location information, including name, short description and picture.
 */
export interface LocationDetails {
  /**
   * The name of the location.
   */
  name: string;
  /**
   * A short description of the location
   */
  description: string;
    /**
   * A URL pointing to a picture of the location
   */
  pictureUrl: string;
}

/**
 * Asynchronously retrieves location information for a given location.
 *
 * @param location The location for which to retrieve weather data.
 * @returns A promise that resolves to a LocationDetails object containing name, description and picture.
 */
export async function getLocationDetails(location: Location): Promise<LocationDetails> {
  // TODO: Implement this by calling an API.

  return {
    name: 'Eiffel Tower',
    description: 'Iconic Parisian landmark',
    pictureUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Tour_Eiffel_Wikimedia_Commons.jpg/800px-Tour_Eiffel_Wikimedia_Commons.jpg'
  };
}
