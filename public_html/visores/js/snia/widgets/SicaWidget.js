/*
 * js/snia/widgets/SicaWidget
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
    "dojo/text!./templates/SicaWidget.html",
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
    "widgets/AperturasCrucesSICAWidget",
    "dojo/dom",
    "dojo/_base/window",
    "dijit/layout/TabContainer",
    "dojo/dom-construct",
    "dijit/layout/ContentPane",
    "dijit/Tooltip",
    "dijit/form/FilteringSelect",
    "dojo/_base/array",
    "dojo/domReady!"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, Graphic, Dibujo, CapaGrafica3SR, wkids, Draw,
    SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color, GeometryService, Geoprocessor,
    Dialog, FeatureSet, Standby, Grafico3SR, a11yclick, Memory, ObjectStoreModel, CheckedMultiSelect,
    DataStore, Select, MultiSelect, AperturasSICAWidget, AperturasCrucesSICAWidget, dom, win, TabContainer, domConstruct,
    ContentPane, Tooltip, FilteringSelect, baseArray) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: true,
        resize : function () {
            if (this._tabSimple) {
                this._tabSimple.resize();
            }
            if (this._tabPrincipal) {
                this._tabPrincipal.resize();
            }
        },
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
                this._dibujo = 0;
                this._i = 0; //es 0 si no dibuja y 1 si dibuja
                this._cargarComboAperturas();
                this.own(
                    on(this._dibujarArea, a11yclick, lang.hitch(this, this._initDibujo)),
                    on(this._dibujarAreaCruces, a11yclick, lang.hitch(this, this._initDibujo)),
                    on(this._eliminarArea, a11yclick, lang.hitch(this, this._eliminarDibujos)),
                    on(this._eliminarAreaCruces, a11yclick, lang.hitch(this, this._eliminarDibujos)),
                    on(this._radioDepto, a11yclick, lang.hitch(this, this._cargarDeptos)),
                    on(this._radioSP, a11yclick, lang.hitch(this, this._cargarSP)),
                    on(this._buscarAperturas, a11yclick, lang.hitch(this, this._cargarAperturas)),
                    on(this._buscarAperturasCruces, a11yclick, lang.hitch(this, this._cargarAperturasCruces))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('SicaWidget::requiere un mapa');
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
            this._msgAgregarArea.innerHTML = this._i18n.widgets.SicaWidget.lblAgregarArea;
            this._dibujo.activar(Draw.POLYGON);
            this._cpg3SR.seleccionarGraficoClickeado();
            this._dibujoUsuario = 1;
        },
        _cargarDeptos: function () {
            var c, departamentosStore;
            departamentosStore = new Memory({
                data: [
                    {name: "Artigas", id: "DArtigas"},
                    {name: "Canelones", id: "DCanelones"},
                    {name: "Cerro Largo", id: "DCerroLargo"},
                    {name: "Colonia", id: "DColonia"},
                    {name: "Durazno", id: "DDurazno"},
                    {name: "Flores", id: "DFlores"},
                    {name: "Florida", id: "DFlorida"},
                    {name: "Lavalleja", id: "DLavalleja"},
                    {name: "Maldonado", id: "DMaldonado"},
                    {name: "Montevideo", id: "DMontevideo"},
                    {name: "Paysandu", id: "DPaysandu"},
                    {name: "Rio Negro", id: "DRioNegro"},
                    {name: "Paysandu", id: "DPaysandu"},
                    {name: "Rivera", id: "DRivera"},
                    {name: "Rocha", id: "DRocha"},
                    {name: "Salto", id: "DSalto"},
                    {name: "San Jose", id: "DSanJose"},
                    {name: "Soriano", id: "Dsoriano"},
                    {name: "Tacuarembo", id: "DTacuarembo"},
                    {name: "Treinta y tres", id: "DTreintaYTres"}
                ]
            });
            for (i = 0; i < departamentosStore.data.length; i = i + 1) {
                c = win.doc.createElement('option');
                c.innerHTML = departamentosStore.data[i].name;
                c.label = departamentosStore.data[i].name;
                c.value = i;
                this._select_predef.appendChild(c);
            }
            this._textSeleccione.innerHTML = "Seleccione el/los Depto/s: ";
//            this.own(
//                    on(this._acercarGeometria, a11yclick, lang.hitch(this, this._acercarDepto))
//            );
        },
       
        _cargarSP: function () {
            this._textSeleccione.innerHTML = "Seleccione la/s SP: ";
        },
        _cargarComboAperturas: function () {
            var i, c;
            for (i in this._data) {
                c = win.doc.createElement('option');
                c.innerHTML = this._data[i].nombre;
                c.label = this._data[i][i];
                c.value = this._data[i].nro;
                if (this._data[i].esta === true) {
                    this.dynamic.appendChild(c);
                }
            }
            for (i in this._data) {
                c = win.doc.createElement('option');
                c.innerHTML = this._data[i].nombre;
                c.label = this._data[i][i];
                c.value = this._data[i].nro;
                if (this._data[i].esta === true) {
                    this._cmbAperturasC1.appendChild(c);
                }
            }
            for (i in this._data) {
                c = win.doc.createElement('option');
                c.innerHTML = this._data[i].nombre;
                c.label = this._data[i][i];
                c.value = this._data[i].nro;
                if (this._data[i].esta === true) {
                    this._cmbAperturasC2.appendChild(c);
                }
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
            this._dibujo.desactivar();
            this._cpg3SR.removerMapa();
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
            this._tabPrincipal.startup();
            this._tabSimple.startup();
            this._aperturasSeleccionadas = [];
            this._visible();
            this._i = 0;
            this._dibujoUsuario = 1;
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
            this._gpCroquis = new Geoprocessor("https://web.renare.gub.uy/arcgis/rest/services/SNIA/Sica2011/GPServer/gpSicaII");
//            Rueda de espera
            this._standbyAreas = new Standby({target: this._ruedaEspera});
            domConstruct.place(this._standbyAreas.domNode, this._ruedaEspera, "after");
            this._standbyAreas.startup();  
            //Rueda de cruces
            this._standbyAreasCruces = new Standby({target: this._ruedaEsperaCruces});
            domConstruct.place(this._standbyAreasCruces.domNode, this._ruedaEsperaCruces, "after");
            this._standbyAreasCruces.startup();
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
            var i, g, area, featureSet, parametros, areas = [];
            this._aperturasSeleccionadasSimple = "";
            if (this._i === 0 && this._dibujoUsuario === 1) {
                this._msgAgregarArea.innerHTML = "Se necesita al menos un área";
            } else {
                if (this.dynamic.selectedOptions.length === 0) { //no hay ninguno seleccionado
                    this._msgAgregarArea.innerHTML = "Debe seleccionar al menos 1 apertura";
                } else {
                    this._msgAgregarArea.innerHTML = " ";
                    for (i = 0; i < this.dynamic.selectedOptions.length; i = i + 1) {
                        this._aperturasSeleccionadasSimple = this._aperturasSeleccionadasSimple + this.dynamic.selectedOptions[i].value;
                        if (i + 1 < this.dynamic.selectedOptions.length) {
                            this._aperturasSeleccionadasSimple = this._aperturasSeleccionadasSimple + ";";
                        }
                    }
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
                    //no es multiple -> cuando por ejemplo hago departamentos.  

                        parametros = {
                            variables: this._aperturasSeleccionadasSimple,
                            multiple: false,
                            Poligono: featureSet,
                            Predefinida : " "
                        };
                    this._standbyAreas.show();
                    this._gpCroquis.submitJob(parametros, lang.hitch(this, this._gpCroquisComplete));                
                }
            }
        },
        _cargarAperturasCruces: function () {
            var i;
            this._aperturasSeleccionadasPrimerFiltro = "";
            this._aperturasSeleccionadasSegundoFiltro = "";
            this._aperturasSeleccionadasCruce = "";
            if (this._i === 0 && this._dibujoUsuario === 1) {
                this._msgAgregarAreaC1.innerHTML = "<p style=\"color:red\";><br>Se necesita al menos un área</p>";
            } else {
                if (this._cmbAperturasC1.selectedOptions.length !== 1) { //no hay ninguna apertura seleccionada
                    this._msgAgregarAreaC1.innerHTML = "<p style=\"color:red\";><br> Debe seleccionar una apertura</p>";
                } else { //eligio la apertura
                    this._msgAgregarAreaC1.innerHTML = " ";
                    this._aperturasSeleccionadasCruce = this._cmbAperturasC1.selectedOptions[0].value + ";";
                    if (this._cmbAperturasC2.selectedOptions.length === 0) {
                        this._msgAgregarAreaC2.innerHTML = "Debe seleccionar al menos una apertura para cruzar.";
                    } else {
                        this._msgAgregarAreaC2.innerHTML = " ";
                        for (i=0; i < this._cmbAperturasC2.selectedOptions.length; i++){
                            this._aperturasSeleccionadasCruce = this._aperturasSeleccionadasCruce + this._cmbAperturasC2.selectedOptions[i].value;
                            if(i + 1 < this._cmbAperturasC2.selectedOptions.length){
                                 this._aperturasSeleccionadasCruce = this._aperturasSeleccionadasCruce + ";";
                            }
                        }
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
                            variables: this._aperturasSeleccionadasCruce,
                            multiple: true,
                            Poligono: featureSet
                        };
                        this._standbyAreasCruces.show();
                        this._gpCroquis.submitJob(parametros, lang.hitch(this, this._gpCroquisCompleteCruces)); 
                    }
                }
            }
        },       
        
        _gpCroquisComplete: function (jobInfo) {
            this._gpCroquis.getResultData(jobInfo.jobId, "Error", lang.hitch(this, this._gpCroquisResultDataCallBackError), lang.hitch(this, this._gpCroquisResultDataErr));
            this._gpCroquis.getResultData(jobInfo.jobId, "Resultado", lang.hitch(this, this._gpCroquisResultDataCallBack), lang.hitch(this, this._gpCroquisResultDataErr));
            
        },
        _gpCroquisResultDataCallBackError: function(value){
            this._error = value.value;
        },
        _gpCroquisResultDataCallBackErrorCruces: function(value){
            this._errorCruces = value.value;
        },
        _gpCroquisCompleteCruces: function (jobInfo) {
             this._gpCroquis.getResultData(jobInfo.jobId, "Error", lang.hitch(this, this._gpCroquisResultDataCallBackErrorCruces), lang.hitch(this, this._gpCroquisResultDataErrCruces));
            this._gpCroquis.getResultData(jobInfo.jobId, "Resultado", lang.hitch(this, this._gpCroquisResultDataCallBackCruces), lang.hitch(this, this._gpCroquisResultDataErrCruces));
        },
        _gpCroquisResultDataCallBack: function (value) {
            this._standbyAreas.hide();
            var dialogo = "";
            var ap = new Object();    
            if (this._aperturasSICAWidget) {
                this._aperturasSICAWidget.destroyRecursive(true);
             }
            for (var i = 0; i < this.dynamic.selectedOptions.length; i = i+1){
               ap.id = i;
               ap.label = this.dynamic.selectedOptions[i].innerHTML + "";
               ap.nombre = "" + this.dynamic.selectedOptions[i].label + "";
               this._aperturasSeleccionadas[i] = ap;  
               ap = new Object();
            }
            this._cruces = value.value;
            if(this._error !== "3"){
                if(this._error !== "1"){
                    this._aperturasSICAWidget = new AperturasSICAWidget({mapa: this.mapa, data: this._cruces, aperturas: this._aperturasSeleccionadas, config: this.config, cruces: false, error: this._error});
                    this._aperturasSICAWidget.startup();
                    this._aperturasSICAWidget.show();
                    dialogo = new Dialog({
                        title : "Aperturas ",
                        style : "width: 800px",
                        content: this._aperturasSICAWidget
                    });
                    dialogo.startup();
                    dialogo.show(); 
                }else{
                    this._msgAgregarArea.innerHTML = "<p style=\"color:red\";>Su consulta contiene menos de 20 formularios, realice la consulta nuevamente, seleccionando un área mas grande.</p>";                
                }
            }else{
                this._msgAgregarArea.innerHTML = "<p style=\"color:red\";>Error en script. Contáctese con el administrador</p>";                
            }
        },
        _gpCroquisResultDataErr: function (err) {
            console.log(err.message);
        },
        _gpCroquisResultDataCallBackCruces: function (value) {
            this._standbyAreasCruces.hide();
            this._cruces = value.value;
            if (this._aperturasSICAWidgetCruces) {
                this._aperturasSICAWidgetCruces.destroyRecursive(true);
            }
            if(this._error !== "3"){
                if(this._errorCruces !== "1"){
                    this._aperturasSICAWidgetCruces = new AperturasCrucesSICAWidget({mapa: this.mapa, data: this._cruces, aperturas: this._aperturasSeleccionadasCruce, config: this.config, cruces: true, error: this._errorCruces});
                    this._aperturasSICAWidgetCruces.startup();
                    this._aperturasSICAWidgetCruces.show();
                    var dialogo = new Dialog({
                        title : "Aperturas Cruces",
                        style : "width: 800px",
                        content: this._aperturasSICAWidgetCruces
                    });
                    dialogo.startup();
                    dialogo.show();
                }else{
                    this._msgAgregarAreaCruces.innerHTML = "<p style=\"color:red\";>Debe seleccionar un área más grande</p>";                
                }
            }else{
                this._msgAgregarAreaCruces.innerHTML = "<p style=\"color:red\";>Error en script. Contáctese con el administrador</p>";               
            }
        },
        _gpCroquisResultDataErrCruces: function (err) { //_gpCroquisResultDataErrCruces
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
