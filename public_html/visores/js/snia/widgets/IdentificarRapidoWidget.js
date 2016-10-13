/*
 * js/snia/widgets/IdentificarWidget
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
    "dojo/text!./templates/IdentificarWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "modulos/CapaGrafica3SR",
    "esri/Color",
    "esri/graphic",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "dojo/store/Memory",
    "dojox/grid/DataGrid",
    "dojo/data/ObjectStore",
    "dijit/tree/ObjectStoreModel",
    "dijit/Tree",
    "modulos/Dibujo",
    "esri/toolbars/draw",
    "esri/tasks/IdentifyParameters",
    "esri/tasks/IdentifyTask",
    "dojo/store/Observable",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "dojo/domReady!"
], function (on, Evented, arrayUtil, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle,
    CapaGrafica3SR, Color, Graphic, SimpleLineSymbol, SimpleFillSymbol, Memory,
    DataGrid, ObjectStore, ObjectStoreModel, Tree, Dibujo, Draw, IdentifyParameters, IdentifyTask, Observable, ArcGISDynamicMapServiceLayer) {
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
            this.watch("dibujoEnable", this._dibujoEnabledChanged);
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
            this._gridFields = {
                campo: defaults.config.campo,
                valor: defaults.config.valor
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(
                );
            }
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('IdentificarRapidoWidget::requiere un mapa');
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
            this._store = null;
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
                this._tree.destroy();
                this._cg3sr.removerMapa();
                this._cg3sr.limpiar();
                this._gridStore = new Memory();
                lang.hitch(this, this._setGrid());
                this._store = new Memory({
                    data: [{ name: "raiz", id: "root"}],
                    getChildren: function (object) {
                        return this.query({parent: object.id});
                    }
                });
                this._myModel = new ObjectStoreModel({
                    store: this._store,
                    query: {id:  "root"}
                });
                this._tree = new Tree({
                    model: this._myModel,
                    showRoot: false
                });
                this._dibujo.desactivar();
            } else {
                this._cg3sr.agregarMapa(this.mapa);
                if (this._dibujo) {
                    this._dibujo.activar(Draw.POINT);
                    this._resultadoNodeIdentificar.innerHTML = this._i18n.widgets.IdentificarWidget.lbClicIdentificar;
                }
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
        _dibujoEnabledChanged: function () {
            this.emit("dibujo-enabled-changed", {});
        },
        _init: function () {
            this._symbol = new SimpleFillSymbol("solid",
                new SimpleLineSymbol("solid", new Color([0, 255, 255, 0.8]), 2), null);
            this._cg3sr = new CapaGrafica3SR({ id: "identificarLayer" });
            this._cg3sr.agregarMapa(this.mapa);
            //this.mapa.agregarCg3SR(this._cg3sr);            
            this._gridStore = new Memory();
            this._store = new Memory({
                data: [{ name: "raiz", id: "root"}],
                getChildren: function (object) {
                    return this.query({parent: object.id});
                }
            });
            this._myModel = new ObjectStoreModel({
                store: this._store,
                query: {id:  "root"}
            });
            this._tree = new Tree({
                model: this._myModel,
                showRoot: false,
                getIconClass: function () {
                    return "custimg";
                }
            });
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
            this._cg3sr.limpiar();
            lang.hitch(this, this._initDibujo());
            lang.hitch(this, this._initGrid());
            this._activar();
            this._resultadoNodeIdentificar.innerHTML = this._i18n.widgets.IdentificarWidget.lbClicIdentificar;
        },
        _initDibujo: function () {
            this._dibujo = new Dibujo();
            this._dibujo.agregarMapa(this.mapa);
            on(this._dibujo, "dibujo-complete", lang.hitch(this, this._dibujoComplete));
            this._dibujo.activar(Draw.POINT);
        },
        _dibujoComplete: function (evt) {
            var haycapas;
            this._tree.destroy();
            this._store = new Memory({
                data: [{name: "raiz", id: "root"}],
                getChildren: function (object) {
                    return this.query({parent: object.id});
                }
            });
            this._store = new Observable(this._store);
            this._myModel = new ObjectStoreModel({
                store: this._store,
                query: {id:  "root"}
            });
            this._tree = new Tree({
                model: this._myModel,
                showRoot: false,
                onOpen: lang.hitch(this, function (item, node) {
                    var children, c, nodoItem, esHijo;
                    children = node.getChildren();
                    for (c in children) {
                        if (children.hasOwnProperty(c)) {
                            nodoItem = children[c].get('item');
                            esHijo = nodoItem.nodo.toString()==="hijo";
                            if (this._tree && nodoItem && !esHijo) {
                                this._tree._expandNode(children[c]);
                            }
                        }
                    }
                }),
                onClick: lang.hitch(this, this._treeClick)
            });
            this._tree.placeAt(this._identificarTree);
            this._tree.startup();
            this._contador = 0;
            this._cantLlamadas = 0;
            haycapas = false;
            this._ext = 0;
            arrayUtil.forEach(this.mapa.mapLayers, lang.hitch(this, function (layer) {
                if (layer instanceof ArcGISDynamicMapServiceLayer) {
                    this._identify = new IdentifyTask(layer.url);
                    this._identifyParams = new IdentifyParameters();
                    this._identifyParams.mapExtent = this.mapa.map.extent;
                    this._identifyParams.returnGeometry = true;
                    this._identifyParams.timeExtent = this.mapa.map.timeExtent;
                    this._identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
                    this._identifyParams.tolerance = 2;
                    this._identifyParams.layerIds = layer.visibleLayers;
                    if (layer.visible && layer.visibleLayers.length > 0) {
                        haycapas = true;
                        this._identifyParams.geometry = evt.geometry;
                        this._identify.execute(this._identifyParams, lang.hitch(this, this._queryTaskCallback),
                            lang.hitch(this, this._queryTaskErrback));
                        this._cantLlamadas = this._cantLlamadas + 1;
                    }
                }
            }));
            if (haycapas) {
                this._resultadoNodeIdentificar.innerHTML = this._i18n.widgets.IdentificarWidget.lbidentificando;
            } else {
                this._resultadoNodeIdentificar.innerHTML = this._i18n.widgets.IdentificarWidget.lbNoCapas;
            }
        },
        _treeClick : function (item) {
            var key, indice;
            this._tree.resize();
            if (item.nodo === "hoja") {
                this._cg3sr.limpiar();
                this._gridStore = new Memory();
                indice = item.atributos.OBJECTID;
                this._cg3sr.agregarGrafico(indice, new Graphic(item.geometry, this._symbol));
    //            this.mapa.map.setExtent(item.geometry.getExtent());
                for (key in item.atributos) {
                    this._gridStore.add({id: key, valor: item.atributos[key]});
                }
                lang.hitch(this, this._setGrid());
            }
        },
        //auxiliares
        _queryTaskCallback: function (results) {
            var currentCapa, flag;
            currentCapa = 0;
            flag = 0;
            this._contador++;
            if (results.length > 0) {
                arrayUtil.forEach(results, lang.hitch(this, function (feature) {
                    if ((flag === 0) || (feature.layerId !== currentCapa)) {
                        flag = 1;
                        currentCapa = feature.layerId + '-' + feature.layerName;
                        this._store.put({id: currentCapa, name: feature.layerName, parent: "root", nodo: "raiz" });
                    }
                    this._ext = this._ext + 1;
                    this._store.put({id: currentCapa + "-" + feature.feature.attributes.OBJECTID, name: feature.value,  parent: currentCapa, atributos: feature.feature.attributes, geometry: feature.feature.geometry, nodo: "hoja" });
//                    indice = feature.feature.attributes.OBJECTID;
                }));
            }
            if (this._contador === this._cantLlamadas) {
                this._resultadoNodeIdentificar.innerHTML = this._i18n.widgets.IdentificarWidget.lbSeIdentificaron + " " + this._ext + " " + this._i18n.widgets.IdentificarWidget.lbElementos;
            }
            return null;
        },
        _queryTaskErrback: function () {
            this._resultadoNodeIdentificar.innerHTML = this._i18n.widgets.IdentificarWidget.lbErrorIdentificar;
            return null;
        },
        _initGrid: function () {
            var grid, estructura;
            estructura = [[
                { name: "Campo", field: this._gridFields.campo, width: "100px" },
                { name: "Valor", field: this._gridFields.valor, width: "145px" }
            ]];

            grid = new DataGrid({
                id: 'grid2',
                structure: estructura,
                rowSelector: '20px'
            });
                /*append the new grid to the div*/
            grid.placeAt(this._gridDiv2);
                /*Call startup() to render the grid*/
            grid.startup();
            this._grid = grid;
//            grid.on("SelectionChanged",
//                            lang.hitch(this, this._reportSelection), true);
        },
        _setGrid: function () {
            var test_store;
            test_store = new ObjectStore({objectStore: this._gridStore});
            this._grid.setStore(test_store);
        }
    });
    return widget;
});
