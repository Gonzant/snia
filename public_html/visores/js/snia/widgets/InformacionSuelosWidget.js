/*
 * js/snia/widgets/InformacionSuelosWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    "dojo/text!./templates/InformacionSuelosWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "esri/SpatialReference",
    "modulos/CapaGrafica3SR",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/Color",
    "esri/graphic",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "dojo/store/Memory",
    "dijit/form/FilteringSelect",
    "dojox/grid/DataGrid",
    "dojo/data/ObjectStore",
    "dojo/_base/array",
    "dijit/Tooltip",    
    "dojo/json",
    "dojo/dom-construct",
    "dojox/widget/Standby",
    "dojo/domReady!"
], function (on, Evented, arrayUtil, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, i18n, domClass, domStyle,
    SpatialReference, CapaGrafica3SR, Query, QueryTask, Color, Graphic, SimpleLineSymbol, SimpleFillSymbol, Memory, FilteringSelect,
    DataGrid, ObjectStore, baseArray, Tooltip, JSON, domConstruct, Standby ) {
//"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: true,
        resize : function () {
            if (this._grid) {
                this._grid.resize();
            }
        },
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            config: null,
            active: false
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
            this.set("active", defaults.active);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._activar);
            // classes
            this.ConfigJSON = defaults.config.Herramienta;
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(
                    //on(this.mapa, "reload", lang.hitch(this, this._mapaReload)),
                    on(this._buscarNode, a11yclick, lang.hitch(this, this._filtroSelect)),
                    on(this._acercarUnidadMapeoNode, a11yclick, lang.hitch(this, this._acercarSeleccionUnidadMapeo)),
                    on(this._acercarPerfilSeleccionadoNode, a11yclick, lang.hitch(this, this._acercarSeleccionPerfil)),
                    on(this._limpiarSeleccionNode, a11yclick, lang.hitch(this, this._desSeleccion))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('InformacionSuelosWidget::requiere un mapa');
                }
                //  mapa cargado
                if (this.mapa.loaded) {
                    this._init();
                } else {
                    on.once(this.mapa, "load", lang.hitch(this, function () {
                        this._init();
                    }));
                }
            }
        },
        // connections/subscriptions se limpian durante la fase destroy()
        destroy: function () {
            this.inherited(arguments);
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
        _activar: function () {
            if (!this.get("active")) {
                this._cg3sr.removerMapa();
                this._cg3srPunto.removerMapa();
            } else {
                this._cg3sr.agregarMapa(this.mapa);
                this._cg3srPunto.agregarMapa(this.mapa);
                this._cg3sr.limpiar();
                this._cg3srPunto.limpiar();
            }
            this.emit("active-changed", {});
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
        _updateThemeWatch: function (oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _init: function () {
            this._standby = new Standby({target: this._basic2});
            domConstruct.place(this._standby.domNode, this._basic2, "after");
//            document.body.appendChild(this._standby.domNode);
            this._standby.startup();
            this._standby.show();
            this._config = this.ConfigJSON;
            this._symbol = new SimpleFillSymbol("solid",
                new SimpleLineSymbol("solid", new Color([0, 255, 255, 0.8]), 2), null);
            this._cg3sr = new CapaGrafica3SR({ id: "infoSuelos" });
            this._cg3sr.agregarMapa(this.mapa);
            this._cg3srPunto = new CapaGrafica3SR({ id: "infoSuelosPunto" });
            this._cg3srPunto.agregarMapa(this.mapa);
            this._urlQuery = this._config.Servicio;
            this._queryTask = new QueryTask(this._urlQuery);
            this._queryTaskUnaidadMapeo = new QueryTask(this._config.ServicioUnidadMapeo);
            this._queryTaskPerfil = new QueryTask(this._config.ServicioPerfil);
            this._query = new Query();
            this._query.outSpatialReference = new SpatialReference(this.mapa.map.spatialReference.wkid);
            this._query.returnGeometry = false;
            this._query.outFields = ["*"];
            this._store = new Memory();
            this._visible();
            this._activar();
            this.set("loaded", true);
            this.emit("load", {});
            this._cg3sr.limpiar();
            this._cg3srPunto.limpiar();
            this._templateIni();
            this._filtro = "2";
             /*ToolTips*/
            // Ejecutra la query que carga la capa parametrizada 
            this._excecute();
            this._n = 0;
            this._elemento = null;
            new Tooltip({
                connectId: [this._acercarUnidadMapeoNode.domNode],
                label: "<b>" + this._i18n.widgets.InformacionSuelosWidget.lbAcercarUnidadMapeo + "<br>"
            });
            new Tooltip({
                connectId: [this._acercarPerfilSeleccionadoNode.domNode],
                label: "<b>" + this._i18n.widgets.InformacionSuelosWidget.lbAcercarPerfil + "<br>"
            });
            new Tooltip({
                connectId: [this._limpiarSeleccionNode.domNode],
                label: "<b>" + this._i18n.widgets.InformacionSuelosWidget.lbLimpiar + "<br>"
            });
        },
        _excecute : function () {
            this._query.where = " 1 = 1 ";
            this._queryTask.execute(this._query, lang.hitch(this, this._queryTaskCallback),
                lang.hitch(this, this._queryTaskErrback));
        },
        _templateIni : function () {
            var select, ordenStore, filtrarStore, selectFiltrar;

            lang.hitch(this, this._initGrid());
            ordenStore = new Memory({
                data: [
                    {name: "No", id: "1"},
                    {name: "Unidad Mapeo", id: "2"},
                    {name: "Serie", id: "3"},
                    {name: "Perfil", id: "4"}
                ]
            });
            select = new FilteringSelect({
                id: "ordenar",
                readonly: "True",
                value: "1",
                store: ordenStore,
                onChange: lang.hitch(this, this._ordenSelect)
            }, this._ordenar);
            select.startup();
            filtrarStore = new Memory({
                data: [
                    {name: "Unidad Mapeo", id: "2"},
                    {name: "Serie", id: "3"},
                    {name: "Perfil", id: "4"}
                ]
            });
            selectFiltrar = new FilteringSelect({
                id: "filtrar",
                readonly: "True",
                value: "2",
                store: filtrarStore,
                onChange: lang.hitch(this, function (state) {
                    this._filtro = state;
                })
            }, this._filtrar);
            selectFiltrar.startup();
        },
        _acercarSeleccionUnidadMapeo : function () {
            this._cg3sr.limpiar();
            this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbBuscando;
            this._query.where = "UM = '" + this._elemento.UM + "'";
            this._query.returnGeometry = true;
            this._queryTaskUnaidadMapeo.execute(this._query, lang.hitch(this, this._queryTaskCallbackGeometry),
                lang.hitch(this, this._queryTaskErrbackGeometry));
        },
        _acercarSeleccionPerfil : function () {
            this._cg3srPunto.limpiar();
            this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbBuscando;
            this._query.where = this._config.CampoIdServicioPerfil + " = '" + this._elemento.SeriePerfilRepresentativo + "'";
            this._query.returnGeometry = true;
            this._queryTaskPerfil.execute(this._query, lang.hitch(this, this._queryTaskCallbackGeometryPerfil),
                lang.hitch(this, this._queryTaskErrbackGeometry));
        },
        _desSeleccion : function () {
            this._cg3sr.limpiar();
            this._cg3srPunto.limpiar();
        },
        //auxiliares
        _queryTaskCallback: function (results) {
            if (results.features.length > 0) {
                arrayUtil.forEach(results.features, lang.hitch(this, function (feature) {
                    this._store.put(feature.attributes);
                }));
            }
            lang.hitch(this, this._setGrid());
            this._standby.hide();
            return null;
        },
        _queryTaskErrback: function () {
            this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbErrorBuscar;
            return null;
        },
        _initGrid: function () {
            var grid, estructura;
            estructura = [[
                { name: "Unidad Mapeo", field: this._config.CampoEtiquetaUnidadMapeo, width: "84px" },
                { name: "Serie", field: this._config.CampoSimboloSerie, width: "84px" },
                { name: "Perfil", field: this._config.CampoIdPerfilRepresentativo, width: "115px" },
                { name: "&nbsp", field: "", width: "54px" }
            ]];

            grid = new DataGrid({
                structure: estructura,
                rowSelector: '20px',
                onRowClick: lang.hitch(this, this._clickGrid)
            });
                /*append the new grid to the div*/
            grid.placeAt(this._gridInfSuelos);
                /*Call startup() to render the grid*/
            grid.startup();
            this._grid = grid;
        },
        _clickGrid: function (state) {
            var elemento, url, idx, idy, rowData;
            idx = state.rowIndex;
            idy = state.cellIndex;
            rowData = this._grid.getItem(idx);
            this._grid.selection.clear(idx);
            this._grid.selection.addToSelection(idx);
            switch (idy) {
            case 0:
                this._elemento = rowData;
                elemento = rowData.UM;
                elemento = elemento.replace(/\+/g, ".");
                elemento = elemento.replace(/\//g, ",");
                url = this._config.UrlUnidadMapeo + "/" + elemento + ".pdf";
                break;
            case 1:
                this._elemento = rowData;
                elemento = rowData.SerieSimbolo;
                url = this._config.UrlSerie + "/" + elemento + ".pdf";
                break;
            case 2:
                this._elemento = rowData;
                elemento = rowData.SeriePerfilRepresentativo;
                url = this._config.UrlPerfil + "/" + elemento + ".pdf";
                break;
            case 3:
                this._elemento = rowData;
                break;
            }
            if (elemento) {
                window.open(url);
            }
        },
        _setGrid: function () {
            var test_store;
            test_store = new ObjectStore({objectStore: this._store});
            this._grid.setStore(test_store);
        },
        _filtroSelect: function () {
            var filtro = {};
            switch (this._filtro) {
            case '2':
                filtro[this._config.CampoEtiquetaUnidadMapeo] = "*" + this._filtroTexto.value + "*";
                this._grid.filter(filtro);
                break;
            case '3':
                filtro[this._config.CampoSimboloSerie] = "*" + this._filtroTexto.value + "*";
                this._grid.filter(filtro);
                break;
            case '4':
                filtro[this._config.CampoIdPerfilRepresentativo] = "*" + this._filtroTexto.value + "*";
                this._grid.filter(filtro);
                break;
            }
        },
        _ordenSelect: function (orden) {
            switch (orden) {
            case '1':
                this._grid.setSortIndex(5, true);
                break;
            case '2':
                this._grid.setSortIndex(0, true);
                break;
            case '3':
                this._grid.setSortIndex(1, true);
                break;
            case '4':
                this._grid.setSortIndex(2, true);
                break;
            }
        },
        //auxiliares
        _queryTaskCallbackGeometry: function (results) {
            var ext, indice;
            if (results.features.length > 0) {
                arrayUtil.forEach(results.features, lang.hitch(this, function (feature) {
                    // Supongo que por resultado tiene que haber solo un padron
                    ext = feature.geometry.getExtent();
                    indice = feature.attributes.OBJECTID;
                    this._cg3sr.agregarGrafico(indice, new Graphic(feature.geometry, this._symbol));
                }));
                this.mapa.map.setExtent(ext);
                this._resultadoNode.innerHTML = "";
            } else {
                this._resultadoNode.innerHTML = this._i18n.widgets.InformacionSuelosWidget.lbSinElementos;
            }
            return null;
        },
        _queryTaskCallbackGeometryPerfil: function (results) {
            var indice;
            if (results.features.length > 0) {
                arrayUtil.forEach(results.features, lang.hitch(this, function (feature) {
                    indice = feature.attributes.OBJECTID;
                    this._cg3srPunto.agregarGrafico(indice, new Graphic(feature.geometry));
                }));
                this._resultadoNode.innerHTML = "";
            } else {
                this._resultadoNode.innerHTML = this._i18n.widgets.InformacionSuelosWidget.lbSinElementos;
            }
            return null;
        },
        _queryTaskErrbackGeometry: function () {
            this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbErrorBuscar;
            return null;
        }
    });
    return widget;
});
