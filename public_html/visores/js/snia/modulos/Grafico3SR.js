/*
 * js/snia/modulos/Grafico3SR
 * 
 */
/*global define*/
/*jslint nomen: true*/
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "esri/graphic",
    "esri/SpatialReference",
    "esri/geometry/Point",
    "esri/geometry/Multipoint",
    "esri/geometry/Polyline",
    "esri/geometry/Polygon",
    "esri/geometry/Extent",
    "esri/geometry/webMercatorUtils",
    "modulos/geoUTMConversor",
    "modulos/wkids",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/Color"
], function (declare,
    arrayUtil,
    Graphic,
    SpatialReference,
    Point,
    Multipoint,
    Polyline,
    Polygon,
    Extent,
    webMercatorUtils,
    geoUTMConversor,
    wkids,
    SimpleLineSymbol,
    SimpleFillSymbol,
    SimpleMarkerSymbol,
    Color
    ) {
    "use strict";
    return declare(null, {
        //privado
        _g_utm : null,//Graphic (UTM)
        _g_geo : null,//Graphic (Geografica)
        _g_wm : null,//Graphic (Web Mercator)
        _symbol: null,
        _s_lineDefault : new SimpleLineSymbol("solid", new Color([0, 0, 0, 0.8]), 2),
        _s_pointDefault : new SimpleMarkerSymbol().setColor(new Color([0, 0, 0])),
        _s_polygonDefault : new SimpleFillSymbol("solid",
                new SimpleLineSymbol("solid", new Color([0, 0, 0, 0.8]), 2), null),
        _s_lineSelected : new SimpleLineSymbol("solid", new Color([255, 255, 0, 0.8]), 2),
        _s_pointSelected : new SimpleMarkerSymbol().setColor(new Color([255, 255, 0])),
        _s_polygonSelected : new SimpleFillSymbol("solid",
                new SimpleLineSymbol("solid", new Color([255, 255, 0, 0.8]), 2), null),
        //funciones auxiliares
        _aUTM : function (x, y, wkid) {
            var xy, ll;
            xy = [];
            if (wkid === wkids.UTM) {
                xy[0] = x;
                xy[1] = y;
            } else if (wkid === wkids.GEO) {
                xy = geoUTMConversor.latLonAUTM21s(x, y);
            } else if (wkid === wkids.WM) {
                ll = webMercatorUtils.xyToLngLat(x, y);
                xy = geoUTMConversor.latLonAUTM21s(ll[1], ll[0]);
            }
            return xy;
        },
        _aGEO : function (x, y, wkid) {
            var xy, ll;
            xy = [];
            if (wkid === wkids.UTM) {
                ll = geoUTMConversor.utm21sALatLon(x, y);
                xy[0] = ll[1];
                xy[1] = ll[0];
            } else if (wkid === wkids.GEO) {
                xy[0] = x;
                xy[1] = y;
            } else if (wkid === wkids.WM) {
                ll = webMercatorUtils.xyToLngLat(x, y);
                xy[0] = ll[1];
                xy[1] = ll[0];
            }
            return xy;
        },
        _aWM : function (x, y, wkid) {
            var xy, ll;
            if (wkid === wkids.UTM) {
                ll = geoUTMConversor.utm21sALatLon(x, y);
                xy = webMercatorUtils.lngLatToXY(ll[1], ll[0]);
            } else if (wkid === wkids.GEO) {
                xy = webMercatorUtils.lngLatToXY(x, y);
            } else if (wkid === wkids.WM) {
                xy = [];
                xy[0] = x;
                xy[1] = y;
            }
            return xy;
        },
        //publico
        /**
        * Constructor de la clase.
        * @param {esri/graphic} g.
        */
        constructor : function (g) {
            var geomUTM, geomGEO, geomWM, self,
                xyUTM, xyGEO, xyWM, symbol;
            self = this;
            symbol = g.symbol;
            this._symbol=g.symbol;
            //geometria
            switch (g.geometry.type) {
            case 'point':
                xyUTM = this._aUTM(g.geometry.x, g.geometry.y, g.geometry.spatialReference.wkid);
                geomUTM = new Point(xyUTM, new SpatialReference(wkids.UTM));
                xyGEO = this._aGEO(g.geometry.x, g.geometry.y, g.geometry.spatialReference.wkid);
                geomGEO = new Point(xyGEO, new SpatialReference(wkids.GEO));
                xyWM = this._aWM(g.geometry.x, g.geometry.y, g.geometry.spatialReference.wkid);
                geomWM = new Point(xyWM, new SpatialReference(wkids.WM));
                symbol = symbol || this._s_pointDefault;
                break;
            case 'multipoint':
                geomUTM = new Multipoint(new SpatialReference(wkids.UTM));
                geomGEO = new Multipoint(new SpatialReference(wkids.GEO));
                geomWM = new Multipoint(new SpatialReference(wkids.WM));
                arrayUtil.forEach(g.geometry.points, function (i) {
                    geomUTM.point.push(self._aUTM(i[0], i[1], g.geometry.spatialReference.wkid));
                    geomGEO.point.push(self._aGEO(i[0], i[1], g.geometry.spatialReference.wkid));
                    geomWM.point.push(self._aWM(i[0], i[1], g.geometry.spatialReference.wkid));
                });
                symbol = symbol || this._s_pointDefault;
                break;
            case 'polyline':
                geomUTM = new Polyline(new SpatialReference(wkids.UTM));
                geomGEO = new Polyline(new SpatialReference(wkids.GEO));
                geomWM = new Polyline(new SpatialReference(wkids.WM));
                arrayUtil.forEach(g.geometry.paths, function (i) {
                    xyUTM = [];
                    xyGEO = [];
                    xyWM = [];
                    arrayUtil.forEach(i, function (j) {
                        xyUTM.push(self._aUTM(j[0], j[1], g.geometry.spatialReference.wkid));
                        xyGEO.push(self._aGEO(j[0], j[1], g.geometry.spatialReference.wkid));
                        xyWM.push(self._aWM(j[0], j[1], g.geometry.spatialReference.wkid));
                    });
                    geomUTM.addPath(xyUTM);
                    geomGEO.addPath(xyGEO);
                    geomWM.addPath(xyWM);
                });
                symbol = symbol || this._s_lineDefault;
                break;
            case 'polygon':
                geomUTM = new Polygon(new SpatialReference(wkids.UTM));
                geomGEO = new Polygon(new SpatialReference(wkids.GEO));
                geomWM = new Polygon(new SpatialReference(wkids.WM));
                arrayUtil.forEach(g.geometry.rings, function (i) {
                    xyUTM = [];
                    xyGEO = [];
                    xyWM = [];
                    arrayUtil.forEach(i, function (j) {
                        xyUTM.push(self._aUTM(j[0], j[1], g.geometry.spatialReference.wkid));
                        xyGEO.push(self._aGEO(j[0], j[1], g.geometry.spatialReference.wkid));
                        xyWM.push(self._aWM(j[0], j[1], g.geometry.spatialReference.wkid));
                    });
                    geomUTM.addRing(xyUTM);
                    geomGEO.addRing(xyGEO);
                    geomWM.addRing(xyWM);
                });
                symbol = symbol || this._s_polygonDefault;
                break;
            case 'extent':
                xyUTM = [];
                xyGEO = [];
                xyWM = [];
                xyUTM.push(self._aUTM(g.geometry.xmin, g.geometry.ymin, g.geometry.spatialReference.wkid));
                xyUTM.push(self._aUTM(g.geometry.xmax, g.geometry.ymax, g.geometry.spatialReference.wkid));
                xyGEO.push(self._aGEO(g.geometry.xmin, g.geometry.ymin, g.geometry.spatialReference.wkid));
                xyGEO.push(self._aGEO(g.geometry.max, g.geometry.ymax, g.geometry.spatialReference.wkid));
                xyWM.push(self._aWM(g.geometry.xmin, g.geometry.ymin, g.geometry.spatialReference.wkid));
                xyWM.push(self._aWM(g.geometry.xmax, g.geometry.ymax, g.geometry.spatialReference.wkid));
                geomUTM = new Extent(xyUTM[0][0], xyUTM[0][1], xyUTM[1][0], xyUTM[1][1], new SpatialReference(wkids.UTM));
                geomGEO = new Extent(xyGEO[0][0], xyGEO[0][1], xyGEO[1][0], xyGEO[1][1], new SpatialReference(wkids.GEO));
                geomWM = new Extent(xyWM[0][0], xyWM[0][1], xyWM[1][0], xyWM[1][1], new SpatialReference(wkids.WM));
                symbol = symbol || this._s_polygonDefault;
                break;
            }
            //graficos
            this._g_utm = new Graphic(geomUTM);
            this._g_geo = new Graphic(geomGEO);
            this._g_wm = new Graphic(geomWM);
            //atributos
            if (g.attributes) {
                arrayUtil.forEach(g.attributes, function (a) {
                    if (g.attributes.hasOwnProperty(a)) {
                        self._g_utm.attr(a, g.attributes[a]);
                        self._g_geo.attr(a, g.attributes[a]);
                        self._g_wm.attr(a, g.attributes[a]);
                    }
                });
            }
            //simbolo
            if (symbol) {
                this._g_utm.setSymbol(symbol);
                this._g_geo.setSymbol(symbol);
                this._g_wm.setSymbol(symbol);
            }
        },
        /*Number*/
        grafico : function (wkid) {
            var g = null;
            switch (wkid) {
            case wkids.UTM:
                g = this._g_utm;
                break;
            case wkids.GEO:
                g = this._g_geo;
                break;
            case wkids.WM:
                g = this._g_wm;
                break;
            }
            return g;
        },
        setLineDefault : function (symbol) {
            this._s_lineDefault = symbol;
        },
        setPointDefault : function (symbol) {
            this._s_pointSelected = symbol;
        },
        setPolygonDefault : function (symbol) {
            this._s_polygonSelected = symbol;
        },
        setLineSelected : function (symbol) {
            this._s_lineSelected = symbol;
        },
        setPointSelected : function (symbol) {
            this._s_pointSelected = symbol;
        },
        setPolygonSelected : function (symbol) {
            this._s_polygonSelected = symbol;
        },
        selectGraphic : function () {
            var symbol;
            switch (this._g_utm.geometry.type) {
            case 'point':
                symbol = this._s_pointSelected;
                break;
            case 'multipoint':
                symbol = this._s_pointSelected;
                break;
            case 'polyline':
                symbol = this._s_lineSelected;
                break;
            case 'polygon':
                symbol = this._s_polygonSelected;
                break;
            case 'extent':
                symbol = this._s_polygonSelected;
                break;
            }
            this._g_utm.setSymbol(symbol);
            this._g_geo.setSymbol(symbol);
            this._g_wm.setSymbol(symbol);
        },
        unSelectGraphic : function () {
            var symbol;
            symbol = this._symbol;
            switch (this._g_utm.geometry.type) {
            case 'point':
                symbol = symbol || this._s_pointDefault;
                break;
            case 'multipoint':
                symbol = symbol || this._s_pointDefault;
                break;
            case 'polyline':
                symbol = symbol || this._s_lineDefault;
                break;
            case 'polygon':
                symbol = symbol || this._s_polygonDefault;
                break;
            case 'extent':
                symbol = symbol || this._s_polygonDefault;
                break;
            }
            this._g_utm.setSymbol(symbol);
            this._g_geo.setSymbol(symbol);
            this._g_wm.setSymbol(symbol);
        }
    });
});