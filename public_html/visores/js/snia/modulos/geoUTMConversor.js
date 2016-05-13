/*
 * js/snia/modulos/geoUTMConversor
 * 
 */
/*global define*/
define(function () {
    // Este modulo se basa en el codigo de Charles L. Taylor
    // para realizar las conversiones de coordenadas geograficas
    // a UTM.
    return {
        /*
        * Copyright 1997-1998 by Charles L. Taylor
        * http://home.hiwaay.net/~taylorc/toolbox/geography/geoutm.html
        * Notice: The JavaScript source code in this document may be copied and reused without restriction.
        */
        PI : 3.14159265358979,
        /* Ellipsoid model constants (actual values here are for WGS84) */
        SM_A : 6378137.0,
        SM_B : 6356752.314,
        //sm_EccSquared = 6.69437999013e-03;
        UTMSCALEFACTOR : 0.9996,
        /*
        * DegToRad
        *
        * Converts degrees to radians.
        *
        */
        degToRad : function (deg) {
            return (deg / 180.0 * this.PI);
        },
        /*
        * RagToRad
        *
        * Converts degrees to radians. Manuel!
        *
        */
        radToDeg : function (rad) {
            return (rad / this.PI * 180.0);
        },
        /*
        * ArcLengthOfMeridian
        *
        * Computes the ellipsoidal distance from the equator to a point at a
        * given latitude.
        *
        * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
        * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
        *
        * Inputs:
        *     phi - Latitude of the point, in radians.
        *
        * Globals:
        *     sm_a - Ellipsoid model major axis.
        *     sm_b - Ellipsoid model minor axis.
        *
        * Returns:
        *     The ellipsoidal distance of the point from the equator, in meters.
        *
        */
        arcLengthOfMeridian : function (phi) {
            var alpha, beta, gamma, delta, epsilon, n, result;
            /* Precalculate n */
            n = (this.SM_A - this.SM_B) / (this.SM_A + this.SM_B);
            /* Precalculate alpha */
            alpha = ((this.SM_A + this.SM_B) / 2.0) * (1.0 + (Math.pow(n, 2.0) / 4.0) + (Math.pow(n, 4.0) / 64.0));
            /* Precalculate beta */
            beta = (-3.0 * n / 2.0) + (9.0 * Math.pow(n, 3.0) / 16.0) + (-3.0 * Math.pow(n, 5.0) / 32.0);
            /* Precalculate gamma */
            gamma = (15.0 * Math.pow(n, 2.0) / 16.0)
                + (-15.0 * Math.pow(n, 4.0) / 32.0);
            /* Precalculate delta */
            delta = (-35.0 * Math.pow(n, 3.0) / 48.0)
                + (105.0 * Math.pow(n, 5.0) / 256.0);
            /* Precalculate epsilon */
            epsilon = (315.0 * Math.pow(n, 4.0) / 512.0);
            /* Now calculate the sum of the series and return */
            result = alpha
                * (phi + (beta * Math.sin(2.0 * phi))
                    + (gamma * Math.sin(4.0 * phi))
                    + (delta * Math.sin(6.0 * phi))
                    + (epsilon * Math.sin(8.0 * phi)));
            return result;
        },
        /*
        * UTMCentralMeridian
        *
        * Determines the central meridian for the given UTM zone.
        *
        * Inputs:
        *     zone - An integer value designating the UTM zone, range [1,60].
        *
        * Returns:
        *   The central meridian for the given UTM zone, in radians, or zero
        *   if the UTM zone parameter is outside the range [1,60].
        *   Range of the central meridian is the radian equivalent of [-177,+177].
        *
        */
        utmCentralMeridian : function (zone) {
            var cmeridian;
            cmeridian = this.degToRad(-183.0 + (zone * 6.0));
            return cmeridian;
        },
        /*
        * FootpointLatitude
        *
        * Computes the footpoint latitude for use in converting transverse
        * Mercator coordinates to ellipsoidal coordinates.
        *
        * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
        *   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
        *
        * Inputs:
        *   y - The UTM northing coordinate, in meters.
        *
        * Returns:
        *   The footpoint latitude, in radians.
        *
        */
        footpointLatitude : function (y) {
            var y2, alpha, beta, gamma, delta, epsilon, n, result;
            /* Precalculate n (Eq. 10.18) */
            n = (this.SM_A - this.SM_B) / (this.SM_A + this.SM_B);
            /* Precalculate alpha_ (Eq. 10.22) */
            /* (Same as alpha in Eq. 10.17) */
            alpha = ((this.SM_A + this.SM_B) / 2.0)
                * (1 + (Math.pow(n, 2.0) / 4) + (Math.pow(n, 4.0) / 64));
            /* Precalculate y_ (Eq. 10.23) */
            y2 = y / alpha;
            /* Precalculate beta_ (Eq. 10.22) */
            beta = (3.0 * n / 2.0) + (-27.0 * Math.pow(n, 3.0) / 32.0)
                + (269.0 * Math.pow(n, 5.0) / 512.0);
            /* Precalculate gamma_ (Eq. 10.22) */
            gamma = (21.0 * Math.pow(n, 2.0) / 16.0)
                + (-55.0 * Math.pow(n, 4.0) / 32.0);
            /* Precalculate delta_ (Eq. 10.22) */
            delta = (151.0 * Math.pow(n, 3.0) / 96.0)
                + (-417.0 * Math.pow(n, 5.0) / 128.0);
            /* Precalculate epsilon_ (Eq. 10.22) */
            epsilon = (1097.0 * Math.pow(n, 4.0) / 512.0);
            /* Now calculate the sum of the series (Eq. 10.21) */
            result = y2 + (beta * Math.sin(2.0 * y2))
                + (gamma * Math.sin(4.0 * y2))
                + (delta * Math.sin(6.0 * y2))
                + (epsilon * Math.sin(8.0 * y2));
            return result;
        },
        /*
        * MapLatLonToXY
        *
        * Converts a latitude/longitude pair to x and y coordinates in the
        * Transverse Mercator projection.  Note that Transverse Mercator is not
        * the same as UTM; a scale factor is required to convert between them.
        *
        * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
        * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
        *
        * Inputs:
        *    phi - Latitude of the point, in radians.
        *    lambda - Longitude of the point, in radians.
        *    lambda0 - Longitude of the central meridian to be used, in radians.
        *
        * Outputs:
        *    xy - A 2-element array containing the x and y coordinates
        *         of the computed point.
        *
        * Returns:
        *    The function does not return a value.
        *
        */
        mapLatLonToXY : function (phi, lambda, lambda0, xy) {
            var N, nu2, ep2, t, t2, l, l3coef, l4coef, l5coef, l6coef, l7coef, l8coef;
            /* Precalculate ep2 */
            ep2 = (Math.pow(this.SM_A, 2.0) - Math.pow(this.SM_B, 2.0)) / Math.pow(this.SM_B, 2.0);
            /* Precalculate nu2 */
            nu2 = ep2 * Math.pow(Math.cos(phi), 2.0);
            /* Precalculate N */
            N = Math.pow(this.SM_A, 2.0) / (this.SM_B * Math.sqrt(1 + nu2));
            /* Precalculate t */
            t = Math.tan(phi);
            t2 = t * t;
            //tmp = (t2 * t2 * t2) - Math.pow(t, 6.0);
            /* Precalculate l */
            l = lambda - lambda0;
            /* Precalculate coefficients for l**n in the equations below
               so a normal human being can read the expressions for easting
               and northing
               -- l**1 and l**2 have coefficients of 1.0 */
            l3coef = 1.0 - t2 + nu2;
            l4coef = 5.0 - t2 + 9 * nu2 + 4.0 * (nu2 * nu2);
            l5coef = 5.0 - 18.0 * t2 + (t2 * t2) + 14.0 * nu2
                - 58.0 * t2 * nu2;
            l6coef = 61.0 - 58.0 * t2 + (t2 * t2) + 270.0 * nu2
                - 330.0 * t2 * nu2;
            l7coef = 61.0 - 479.0 * t2 + 179.0 * (t2 * t2) - (t2 * t2 * t2);
            l8coef = 1385.0 - 3111.0 * t2 + 543.0 * (t2 * t2) - (t2 * t2 * t2);
            /* Calculate easting (x) */
            xy[0] = N * Math.cos(phi) * l
                + (N / 6.0 * Math.pow(Math.cos(phi), 3.0) * l3coef * Math.pow(l, 3.0))
                + (N / 120.0 * Math.pow(Math.cos(phi), 5.0) * l5coef * Math.pow(l, 5.0))
                + (N / 5040.0 * Math.pow(Math.cos(phi), 7.0) * l7coef * Math.pow(l, 7.0));
            /* Calculate northing (y) */
            xy[1] = this.arcLengthOfMeridian(phi)
                + (t / 2.0 * N * Math.pow(Math.cos(phi), 2.0) * Math.pow(l, 2.0))
                + (t / 24.0 * N * Math.pow(Math.cos(phi), 4.0) * l4coef * Math.pow(l, 4.0))
                + (t / 720.0 * N * Math.pow(Math.cos(phi), 6.0) * l6coef * Math.pow(l, 6.0))
                + (t / 40320.0 * N * Math.pow(Math.cos(phi), 8.0) * l8coef * Math.pow(l, 8.0));
            return;
        },
        /*
        * MapXYToLatLon
        *
        * Converts x and y coordinates in the Transverse Mercator projection to
        * a latitude/longitude pair.  Note that Transverse Mercator is not
        * the same as UTM; a scale factor is required to convert between them.
        *
        * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
        *   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
        *
        * Inputs:
        *   x - The easting of the point, in meters.
        *   y - The northing of the point, in meters.
        *   lambda0 - Longitude of the central meridian to be used, in radians.
        *
        * Outputs:
        *   philambda - A 2-element containing the latitude and longitude
        *               in radians.
        *
        * Returns:
        *   The function does not return a value.
        *
        * Remarks:
        *   The local variables Nf, nuf2, tf, and tf2 serve the same purpose as
        *   N, nu2, t, and t2 in MapLatLonToXY, but they are computed with respect
        *   to the footpoint latitude phif.
        *
        *   x1frac, x2frac, x2poly, x3poly, etc. are to enhance readability and
        *   to optimize computations.
        *
        */
        mapXYToLatLon : function (x, y, lambda0, philambda) {
            var phif, Nf, Nfpow, nuf2, ep2, tf, tf2, tf4, cf,
                x1frac, x2frac, x3frac, x4frac, x5frac, x6frac, x7frac, x8frac,
                x2poly, x3poly, x4poly, x5poly, x6poly, x7poly, x8poly;
            /* Get the value of phif, the footpoint latitude. */
            phif = this.footpointLatitude(y);
            /* Precalculate ep2 */
            ep2 = (Math.pow(this.SM_A, 2.0) - Math.pow(this.SM_B, 2.0)) / Math.pow(this.SM_B, 2.0);
            /* Precalculate cos (phif) */
            cf = Math.cos(phif);
            /* Precalculate nuf2 */
            nuf2 = ep2 * Math.pow(cf, 2.0);
            /* Precalculate Nf and initialize Nfpow */
            Nf = Math.pow(this.SM_A, 2.0) / (this.SM_B * Math.sqrt(1 + nuf2));
            Nfpow = Nf;
            /* Precalculate tf */
            tf = Math.tan(phif);
            tf2 = tf * tf;
            tf4 = tf2 * tf2;
            /* Precalculate fractional coefficients for x**n in the equations
               below to simplify the expressions for latitude and longitude. */
            x1frac = 1.0 / (Nfpow * cf);
            Nfpow *= Nf;   /* now equals Nf**2) */
            x2frac = tf / (2.0 * Nfpow);
            Nfpow *= Nf;   /* now equals Nf**3) */
            x3frac = 1.0 / (6.0 * Nfpow * cf);
            Nfpow *= Nf;   /* now equals Nf**4) */
            x4frac = tf / (24.0 * Nfpow);
            Nfpow *= Nf;   /* now equals Nf**5) */
            x5frac = 1.0 / (120.0 * Nfpow * cf);
            Nfpow *= Nf;   /* now equals Nf**6) */
            x6frac = tf / (720.0 * Nfpow);
            Nfpow *= Nf;   /* now equals Nf**7) */
            x7frac = 1.0 / (5040.0 * Nfpow * cf);
            Nfpow *= Nf;   /* now equals Nf**8) */
            x8frac = tf / (40320.0 * Nfpow);
            /* Precalculate polynomial coefficients for x**n.
               -- x**1 does not have a polynomial coefficient. */
            x2poly = -1.0 - nuf2;
            x3poly = -1.0 - 2 * tf2 - nuf2;
            x4poly = 5.0 + 3.0 * tf2 + 6.0 * nuf2 - 6.0 * tf2 * nuf2
                    - 3.0 * (nuf2 * nuf2) - 9.0 * tf2 * (nuf2 * nuf2);
            x5poly = 5.0 + 28.0 * tf2 + 24.0 * tf4 + 6.0 * nuf2 + 8.0 * tf2 * nuf2;
            x6poly = -61.0 - 90.0 * tf2 - 45.0 * tf4 - 107.0 * nuf2
                    + 162.0 * tf2 * nuf2;
            x7poly = -61.0 - 662.0 * tf2 - 1320.0 * tf4 - 720.0 * (tf4 * tf2);
            x8poly = 1385.0 + 3633.0 * tf2 + 4095.0 * tf4 + 1575 * (tf4 * tf2);
            /* Calculate latitude */
            philambda[0] = phif + x2frac * x2poly * (x * x)
                    + x4frac * x4poly * Math.pow(x, 4.0)
                    + x6frac * x6poly * Math.pow(x, 6.0)
                    + x8frac * x8poly * Math.pow(x, 8.0);
            /* Calculate longitude */
            philambda[1] = lambda0 + x1frac * x
                    + x3frac * x3poly * Math.pow(x, 3.0)
                    + x5frac * x5poly * Math.pow(x, 5.0)
                    + x7frac * x7poly * Math.pow(x, 7.0);
            return;
        },
        /*
        * LatLonToUTMXY
        *
        * Converts a latitude/longitude pair to x and y coordinates in the
        * Universal Transverse Mercator projection.
        *
        * Inputs:
        *   lat - Latitude of the point, in radians.
        *   lon - Longitude of the point, in radians.
        *   zone - UTM zone to be used for calculating values for x and y.
        *          If zone is less than 1 or greater than 60, the routine
        *          will determine the appropriate zone from the value of lon.
        *
        * Outputs:
        *   xy - A 2-element array where the UTM x and y values will be stored.
        *
        * Returns:
        *   The UTM zone used for calculating the values of x and y.
        *
        */
        latLonToUTMXY : function (lat, lon, zone, xy) {
            this.mapLatLonToXY(lat, lon, this.utmCentralMeridian(zone), xy);
            /* Adjust easting and northing for UTM system. */
            xy[0] = xy[0] * this.UTMSCALEFACTOR + 500000.0;
            xy[1] = xy[1] * this.UTMSCALEFACTOR;
            if (xy[1] < 0.0) {
                xy[1] = xy[1] + 10000000.0;
            }
            return zone;
        },
        /*
        * UTMXYToLatLon
        *
        * Converts x and y coordinates in the Universal Transverse Mercator
        * projection to a latitude/longitude pair.
        *
        * Inputs:
        * x - The easting of the point, in meters.
        * y - The northing of the point, in meters.
        * zone - The UTM zone in which the point lies.
        * southhemi - True if the point is in the southern hemisphere;
        *               false otherwise.
        *
        * Outputs:
        * latlon - A 2-element array containing the latitude and
        *            longitude of the point, in radians.
        *
        * Returns:
        * The function does not return a value.
        *
        */
        utmXYToLatLon : function (x, y, zone, southhemi, latlon) {
            var cmeridian;
            x -= 500000.0;
            x /= this.UTMSCALEFACTOR;
            /* If in southern hemisphere, adjust y accordingly. */
            if (southhemi) {
                y -= 10000000.0;
            }
            y /= this.UTMSCALEFACTOR;
            cmeridian = this.utmCentralMeridian(zone);
            this.mapXYToLatLon(x, y, cmeridian, latlon);
            return;
        },
        /*
         * modulo de DINOT-SIT a partir del codigo anterior
         */
        /*
        * latLonAUTM21S
        *
        * Utilizando la función latLonToUTMXY convierte de latitud/longitud
        * a x e y en la proyección Traversa Universal de Mercator Zona 21 Sur.
        *
        * Entrada:
        *   lat - Latitud del punto en radianes.
        *   lon - Longitud del punto en radianes.
        *
        * Retorno:
        *   xy - Array de 2 elementos con los valores x e y UTM.
        *
        */
        latLonAUTM21s : function (lat, lon) {
            // zona = Math.floor((lon + 180) / 6) + 1;
            var xy = [];
            this.latLonToUTMXY(this.degToRad(lat), this.degToRad(lon), 21, xy);
            return xy;
        },
        /*
        * utm21sALatLon
        *
        * Utilizando la función UTMXYToLatLon convierte las coordenadas x e y
        * en la proyección Traversa Universal de Mercator coordinates al par
        * latitud/longitud
        * 
        * Entrada:
        * x - Este del punto en metros.
        * y - Norte del punto en metros.
        * 
        * Retorno:
        * latlon - Array de dos elementos con los valores latitud y langitud
        *            del punto en radianes.
        *            
        */
        utm21sALatLon : function (x, y) {
            var ll = [];
            this.utmXYToLatLon(x, y, 21, true, ll);
            ll[0] = this.radToDeg(ll[0]);
            ll[1] = this.radToDeg(ll[1]);
            return ll;
        }
    };
});