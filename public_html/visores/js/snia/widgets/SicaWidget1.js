/*
 * js/snia/widgets/SicaWidget1
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/SicaWidget1.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "esri/graphic",
    "modulos/Dibujo",
    "modulos/CapaGrafica3SR",
    "modulos/wkids",
    "esri/toolbars/draw",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/Color",
    "esri/tasks/GeometryService",
    "esri/tasks/Geoprocessor",
    "dijit/Dialog",
    "esri/tasks/FeatureSet",
    "dojox/widget/Standby",
    "modulos/Grafico3SR",
    "dijit/a11yclick",
    "dojo/store/Memory",
    "dijit/tree/ObjectStoreModel",
    "dojox/form/CheckedMultiSelect",
    "dojo/store/DataStore",
    "dijit/form/Select",
    "dijit/form/MultiSelect",
    "widgets/AperturasSICAWidget",
    "dojo/dom",
    "dojo/_base/window",
    "dojo/dom-construct",
    "dojo/domReady!"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, Graphic, Dibujo, CapaGrafica3SR, wkids, Draw,
    SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color, GeometryService, Geoprocessor,
    Dialog, FeatureSet, Standby, Grafico3SR, a11yclick, Memory, ObjectStoreModel, CheckedMultiSelect,
    DataStore, Select, MultiSelect, AperturasSICAWidget, dom, win, domConstruct) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            config: null
        },
        constructor: function (options, srcRefNode) {
           //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            //propiedades
            this.set("mapa", defaults.mapa);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("_data", defaults.config.data);
            this.set("config", defaults.config);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
               // baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this._cargarComboAperturas();
                this.own(
                    on(this._dibujarArea, a11yclick, lang.hitch(this, this._initDibujo)),
                    on(this._eliminarArea, a11yclick, lang.hitch(this, this._eliminarDibujos)),
                    on(this._buscarAperturas, a11yclick, lang.hitch(this, this._cargarAperturas))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('SicaWidget1::requiere un mapa');
            } //  mapa cargado
            if (this.mapa.loaded) {
                this._init();
            } else {
                on.once(this.mapa, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },
        destroy: function () {
            this._dibujo.desactivar();
            this._cpg3SR.removerMapa();
            this.inherited(arguments);
        },
        _initDibujo: function () {
            this._msgAgregarArea.innerHTML = "Dibuje el area en el mapa, doble clic para finalizar";
            this._dibujo.activar(Draw.POLYGON);
            this._cpg3SR.seleccionarGraficoClickeado();
        },
        _cargarComboAperturas: function () {
            var n = 0, i, c;
            for (i in this._data) {
                c = win.doc.createElement('option');
                c.innerHTML = this._data[i].nombre;
                c.label = this._data[i][i];
                c.value = n ++;
                if (this._data[i].esta === true) this.dynamic.appendChild(c);
            }
        },        
        /* ---------------- */
        /* Eventos Publicos */
        /* ---------------- */
        // load
        /* ---------------- */
        /* Funciones publicas */
        /* ---------------- */
        show: function () {
            this.set("visible", true);
        },
        hide: function () {
            this.set("visible", false);
        },
        desactive : function () {
           // this._mapMouseMoveListener.remove();
        },
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
             
        _visible: function () {
            if (this.get("visible")) {
                domStyle.set(this.domNode, 'display', 'block');
            } else {
                domStyle.set(this.domNode, 'display', 'none');
            }
        },
        _init: function () {
            this._aperturasSeleccionadas=[];
            this._visible();
            this._i =0;
            this.set("loaded", true);
            this.emit("load", {});
            this._markerSymbol = new SimpleMarkerSymbol();
            this._markerSymbol.setPath("M16,4.938c-7.732,0-14,4.701-14,10.5c0,1.981,0.741,3.833,2.016,5.414L2,25.272l5.613-1.44c2.339,1.316,5.237,2.106,8.387,2.106c7.732,0,14-4.701,14-10.5S23.732,4.938,16,4.938zM16.868,21.375h-1.969v-1.889h1.969V21.375zM16.772,18.094h-1.777l-0.176-8.083h2.113L16.772,18.094z");
            this._markerSymbol.setColor(new Color("#00FFFF"));
            this._simpleFillSymbol = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([16, 16, 191]), 2),
                new Color([255, 255, 0, 0.25]));
            this._cpg3SR = new CapaGrafica3SR();
            this._dibujo = new Dibujo();
            this._cpg3SR.agregarMapa(this.mapa);
            this._dibujo.agregarMapa(this.mapa);
            on(this._dibujo, "dibujo-complete", lang.hitch(this, this._dibujoComplete));  
            var server = "http://web.renare.gub.uy/arcgis/rest/services/Utilities/Geometry/GeometryServer";
            this._geometryService = new GeometryService(server);
            this._gpCroquis = new Geoprocessor("http://web.renare.gub.uy/arcgis/rest/services/SNIA/Sica2011/GPServer/Sica2011");
            //Rueda de espera
            this._standbyAreas = new Standby({target: this._ruedaEspera});
            domConstruct.place(this._standbyAreas.domNode, this._ruedaEspera, "after");
            this._standbyAreas.startup();
        },
         _dibujoComplete: function (evt) {
            this._i = this._i + 1;
            var g;
            g = new Graphic(evt.geometry, this._simpleFillSymbol);
            this._cpg3SR.agregarGrafico(" " + this._i, g);
            this._dibujo.desactivar();
         },
         _eliminarDibujos: function () {
            this._i = 0;
            this._cpg3SR.limpiar();
            this._msgAgregarArea.innerHTML = " ";
        },
        _cargarAperturas: function () {
            if (this._i === 0) {
                this._msgAgregarArea.innerHTML = "Se necesita al menos un área";
            } 
            else{
                if(this.dynamic.selectedOptions.length === 0){ //no hay ninguno seleccionado
                    this._msgAgregarArea.innerHTML = "Debe seleccionar al menos 1 apertura";
                }else{                
                    this._msgAgregarArea.innerHTML = " ";
                    var g, area, featureSet, parametros, areas = [];
                    for (area in this._cpg3SR._gs) {
                        if (this._cpg3SR._gs.hasOwnProperty(area)) {
                            g = this._cpg3SR._gs[area].grafico(wkids.UTM);
                            g.setAttributes({
                                OBJECTID: 0,
                                ID: area,
                                Shape_Length: 0,
                                Shape_Area: 0
                            });
                            areas.push(g);
                        }
                    }
                    featureSet = new FeatureSet();
                    featureSet.features = areas;
                    parametros = {
                        Poligono: featureSet
                    };
                    this._standbyAreas.show();
                    this._gpCroquis.submitJob(parametros, lang.hitch(this, this._gpCroquisComplete));                
                }
            }
        },       
        _gpCroquisComplete: function (jobInfo) {
            this._gpCroquis.getResultData(jobInfo.jobId, "Resultado", lang.hitch(this, this._gpCroquisResultDataCallBack), lang.hitch(this, this._gpCroquisResultDataErr));
        },
        _gpCroquisResultDataCallBack: function (value) {
            this._standbyAreas.hide();
            var ap = new Object();        
           for (var i = 0; i < this.dynamic.selectedOptions.length; i = i+1){
               ap.id = i;
               ap.label = this.dynamic.selectedOptions[i].innerHTML + "";
               ap.nombre = "" + this.dynamic.selectedOptions[i].label + "";
               this._aperturasSeleccionadas[i] = ap;  
               ap = new Object();
           }
            this._cruces = value.value;
            this._aperturasSICAWidget = new AperturasSICAWidget({mapa: this.mapa, data: this._cruces, aperturas: this._aperturasSeleccionadas, config: this.config});
            this._aperturasSICAWidget.startup();
            this._aperturasSICAWidget.show();
            var dialogo = new Dialog({
                title : "Aperturas ",
                style : "width: 800px",
                content: this._aperturasSICAWidget
            });
            dialogo.startup();
            dialogo.show(); 
        },
        _gpCroquisResultDataErr: function (err) {
            console.log(err.message);
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        }
    });
    return widget;
});
