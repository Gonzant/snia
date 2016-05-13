/*
 * js/snia/widgets/BuscarParametrizadoWidget
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
    "dojo/text!./templates/BuscarParametrizadoWidget.html",
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
    "dojox/widget/Standby",
    "dojo/dom-construct",
    "dojo/domReady!"
], function (on, Evented, arrayUtil, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, i18n, domClass, domStyle,
    SpatialReference, CapaGrafica3SR, Query, QueryTask, Color, Graphic, SimpleLineSymbol, SimpleFillSymbol, Memory, FilteringSelect,
    DataGrid, ObjectStore, baseArray, Tooltip, Standby, domConstruct) {
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
            this._urlQuery = defaults.config.urlQuery;
            this._areasVisible = defaults.config.areasVisible;
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
            this._campoFiltro = defaults.config.campoFiltro;
            this._lblcampoFiltro = defaults.config.lblcampoFiltro;
            this._columnas = defaults.config.columnas;
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(
                    on(this._buscarNode, a11yclick, lang.hitch(this, this._buscarClick)),
                    on(this._acercarSeleccionNode, a11yclick, lang.hitch(this, this._acercarSeleccion)),
                    on(this._desSeleccionNode, a11yclick, lang.hitch(this, this._desSeleccion)),
                    on(this._seleccionarTodoNode, a11yclick, lang.hitch(this, this._seleccionarTodo))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('BuscarWidgetParametros::requiere un mapa');
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
            } else {
                this._cg3sr.agregarMapa(this.mapa);
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
            var TooltipAcercar, TooltipResultado, TooltipSeleccionarTodo;
            this._symbol = new SimpleFillSymbol("solid",
                new SimpleLineSymbol("solid", new Color([0, 255, 255, 0.8]), 2), null);
            this._cg3sr = new CapaGrafica3SR({ id: "buscarLayer" });
            this._cg3sr.agregarMapa(this.mapa);
            this._queryTask = new QueryTask(this._urlQuery);
            this._query = new Query();
            this._query.outSpatialReference = new SpatialReference(this.mapa.map.spatialReference.wkid);
            this._query.returnGeometry = false;
            this._query.outFields = [this._campoFiltro];
            this._query.returnDistinctValues = true;
            this._queryCombo();
            this._store = new Memory();
            this._visible();
            this._activar();
            this.set("loaded", true);
            this.emit("load", {});
            lang.hitch(this, this._templateIni());
            this._cg3sr.limpiar();
            this._label.innerHTML = this._lblcampoFiltro;
             /*ToolTips*/
            TooltipAcercar = new Tooltip({
                connectId: [this._acercarSeleccionNode.domNode],
                position: ['below'],
                label: this._i18n.widgets.BuscarWidget.lbAcercarSeleccion
            });
            TooltipResultado = new Tooltip({
                connectId: [this._desSeleccionNode.domNode],
                position: ['below'],
                label: this._i18n.widgets.BuscarWidget.lbRemoverResultado
            });
            TooltipSeleccionarTodo = new Tooltip({
                connectId: [this._seleccionarTodoNode.domNode],
                position: ['below'],
                label: this._i18n.widgets.BuscarWidget.lbSeleccionarTodo
            });
            this._n = 0;
            this._standby = new Standby({target: this._basic2});
            domConstruct.place(this._standby.domNode, this._basic2, "after");
            this._standby.startup();
            this._standby.show();
        },
        _templateIni : function () {
            this._departamentosStore = new Memory({});
            this._select = new FilteringSelect({
                name: "departamentos",
                placeHolder: "seleccione departamento",
                readonly: "True",
                onChange: lang.hitch(this, function (state) {
                    this._valor = state;
                }),
                store: this._departamentosStore
            }, this._departamentosCombo);
            this._select.startup();
            lang.hitch(this, this._initGrid());
        },
        _queryCombo : function () {
            this._query.where = " 1 = 1 ";
            this._queryTask.execute(this._query, lang.hitch(this, this._queryTaskCallbackCombo),
                lang.hitch(this, this._queryTaskErrbackCombo));
        },
        _buscarClick : function () {
            var departamento, query;
            departamento = this._valor;
            this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbBuscando;
            this._query.returnGeometry = true;
            this._query.outFields = ["*"];
            this._query.returnDistinctValues = false;
            query = this._campoFiltro + "='" + departamento + " ' ";
            this._query.where =  query;
            this._queryTask.execute(this._query, lang.hitch(this, this._queryTaskCallback),
                lang.hitch(this, this._queryTaskErrback));
            this._standby.show();
        },
        _acercarSeleccion : function () {
            var extent, capa, items;
            capa = this._cg3sr;
            items = this._grid.selection.getSelected();
            baseArray.map(items, function (item, i) {
                if (i !== 0) {
                    extent = extent.union(capa.getGrafico(item.OBJECTID).grafico(this.mapa.map.spatialReference.wkid).geometry.getExtent());
                } else {
                    extent = capa.getGrafico(item.OBJECTID).grafico(this.mapa.map.spatialReference.wkid).geometry.getExtent();
                }
                return item.OBJECTID;
            }, this);
            if (extent) {
                this.mapa.map.setExtent(extent);
            }
        },
        _desSeleccion : function () {
            var capa, test_store, items;
            capa = this._cg3sr;
            items = this._grid.selection.getSelected();
            baseArray.map(items, function (item) {
                capa.removerGrafico(item.OBJECTID);
                this._store.remove(item.OBJECTID);
            }, this);
            test_store = new ObjectStore({objectStore: this._store});
            this._grid.setStore(test_store);
            this._grid.selection.clear();
        },
        //auxiliares
        _queryTaskCallback: function (results) {
            var ext, indice;
            this._standby.hide();
            if (results.features.length > 0) {
                arrayUtil.forEach(results.features, lang.hitch(this, function (feature, index) {
                    // Supongo que por resultado tiene que haber solo un padron
                    if (index === 0) {
                        ext = feature.geometry.getExtent();
                    } else {
                        ext = ext.union(feature.geometry.getExtent());
                    }
                    indice = feature.attributes.OBJECTID;
                    feature.attributes.OBJECTID = indice;
                    feature.attributes.id = indice;
                    this._cg3sr.agregarGrafico(indice, new Graphic(feature.geometry, this._symbol));
                    lang.hitch(this, this._setGrid(feature.attributes));
                }));
                this.mapa.map.setExtent(ext);
            }
            if (results.features.length === 1) {
                this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbEncontro  + " " + results.features.length + " " + this._i18n.widgets.BuscarWidget.lbElemento;
            } else {
                this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbEncontraron + " " + results.features.length + " " + this._i18n.widgets.BuscarWidget.lbElementos;
            }
            return null;
        },
        _queryTaskErrback: function () {
            this._standby.hide();
            this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbErrorBuscar;
            return null;
        },
        _queryTaskCallbackCombo: function (results) {
            var indice;
            this._standby.hide();
            if (results.features.length > 0) {
                if (results.features[0].attributes.hasOwnProperty(this._campoFiltro)) {
                    arrayUtil.forEach(results.features, lang.hitch(this, function (feature) {
                        indice = feature.attributes.OBJECTID;
                        feature.attributes.OBJECTID = indice;
                        feature.attributes.id = indice;
                        this._departamentosStore.put({id: feature.attributes[this._campoFiltro], name: feature.attributes[this._campoFiltro]});
                    }));
                }
                this._select.store = this._departamentosStore; // = store_filter;
                this._select.reset();
            }
            return null;
        },
        _queryTaskErrbackCombo: function () {
            this._standby.hide();
            this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbErrorBuscar;
            return null;
        },
        _initGrid: function () {
            var grid, estructura, estructuraMem;
            estructuraMem = new Memory();
            arrayUtil.forEach(this._columnas, lang.hitch(this, function (feature) {
                estructuraMem.put({name: feature.name, field: feature.field, width: feature.width });
            }));
            estructura = [estructuraMem.data];
            grid = new DataGrid({
                structure: estructura,
                rowSelector: '20px'
            });
                /*append the new grid to the div*/
            grid.placeAt(this._gridDiv);
                /*Call startup() to render the grid*/
            grid.startup();
            this._grid = grid;
            grid.on("Deselected",
                            lang.hitch(this, this._onDeselected), true);
            grid.on("Selected",
                            lang.hitch(this, this._onSelected), true);
        },
        _onDeselected: function (vari) {
            var items;
            items = this._grid.getItem(vari);
            if (items) {
                this._cg3sr.deseleccionarGrafico(items.OBJECTID);
            }
        },
        _onSelected: function () {
            var  items;
            items = this._grid.selection.getSelected();
            baseArray.map(items, function (item) {
                if (item) {
                    this._cg3sr.seleccionarGrafico(item.OBJECTID);
                    return item.OBJECTID;
                }
            }, this);
        },
        _seleccionarTodo: function () {
            var capa, idx, gridSelec;
            capa = this._cg3sr;
            idx = 0;
            gridSelec = this._grid.selection;
            this._store.query({}).forEach(function (padron) {
                capa.seleccionarGrafico(padron.OBJECTID);
                gridSelec.setSelected(idx, true);
                idx = idx + 1;
            });
        },
        _setGrid: function (atributos) {
            var test_store;
            this._store.put(atributos);
            test_store = new ObjectStore({objectStore: this._store});
            this._grid.setStore(test_store);
        }
    });
    return widget;
});
