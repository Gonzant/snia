/*
 * js/snia/widgets/BuscarWidget
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
    "dojo/text!./templates/BuscarWidget.html",
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
    "dijit/form/CheckBox",
    "dojox/grid/DataGrid",
    "dojo/data/ObjectStore",
    "dojo/_base/array",
    "dijit/Tooltip",
    "esri/tasks/Geoprocessor",
    "dijit/Dialog",
    "widgets/CubrimientoConeatWidget",
    "dojo/dom",
    "dojo/domReady!"
], function (on, Evented, arrayUtil, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, i18n, domClass, domStyle,
    SpatialReference, CapaGrafica3SR, Query, QueryTask, Color, Graphic, SimpleLineSymbol, SimpleFillSymbol, Memory, FilteringSelect, CheckBox,
    DataGrid, ObjectStore, baseArray, Tooltip, Geoprocessor, Dialog, CubrimientoConeatWidget, dom) {
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
            this._urlgeoProcesor = defaults.config.urlgeoProcesor;
            this._areasVisible = defaults.config.areasVisible;
            this._croquisVisible = defaults.config.croquisVisible;
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
            this._gridFields = {
                departamento: defaults.config.departamento,
                padron: defaults.config.padron,
                catastral: defaults.config.catastral,
                productividad: defaults.config.productividad,
                valorreal: defaults.config.valorreal
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(
                    on(this._buscarNode, a11yclick, lang.hitch(this, this._buscarClick)),
                    on(this._acercarSeleccionNode, a11yclick, lang.hitch(this, this._acercarSeleccion)),
                    on(this._desSeleccionNode, a11yclick, lang.hitch(this, this._desSeleccion)),
                    on(this._seleccionarTodoNode, a11yclick, lang.hitch(this, this._seleccionarTodo)),
                    on(this._croquisNode, a11yclick, lang.hitch(this, this._croquis)),
                    on(this._cubrimientoNode, a11yclick, lang.hitch(this, this._cubrimientoWidget))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('BuscarWidget::requiere un mapa');
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
                if (!this._mantenerGeom){
                    this._cg3sr.removerMapa();
                }
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
            var TooltipAcercar, TooltipResultado, TooltipSeleccionarTodo, TooltipCroquis, TooltipCubrimiento;
            this._symbol = new SimpleFillSymbol("solid",
                new SimpleLineSymbol("solid", new Color([0, 255, 255, 0.8]), 2), null);
            this._cg3sr = new CapaGrafica3SR({ id: "buscarLayer" });
            this._cg3sr.agregarMapa(this.mapa);
            this._queryTask = new QueryTask(this._urlQuery);
            this._query = new Query();
            this._query.outSpatialReference = new SpatialReference(this.mapa.map.spatialReference.wkid);
            this._query.returnGeometry = true;
            this._query.outFields = ["*"];
            this._store = new Memory();
            this._visible();
            this._activar();
            this.set("loaded", true);
            this.emit("load", {});
            this._templateIni();
            this._cg3sr.limpiar();
            this.geoprocessor = new Geoprocessor(this._urlgeoProcesor);
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
            TooltipCroquis = new Tooltip({
                connectId: [this._croquisNode.domNode],
                position: ['below'],
                label: this._i18n.widgets.BuscarWidget.lbCroquisSeleccion
            });
            TooltipCubrimiento = new Tooltip({
                connectId: [this._cubrimientoNode.domNode],
                position: ['below'],
                label: this._i18n.widgets.BuscarWidget.lbCubrimiento
            });
            this._demo = declare(null, {
                overlayNode: null,
                constructor: function () {
                    // save a reference to the overlay
                    this.overlayNode = dom.byId("loadingOverlay");
                },
                startLoading: function () {
                    domStyle.set(this.overlayNode, 'display', 'initial');
                },
                // called to hide the loading overlay
                endLoading: function () {
                    domStyle.set(this.overlayNode, 'display', 'none');
                }
            });
            this._demo = new this._demo();
            this._demo.endLoading();
            this._n = 0;
            if (this._croquisVisible === "0") {
                domStyle.set(this._croquisNode.domNode, 'display', 'none');
            }
            if (this._areasVisible === "0") {
                domStyle.set(this._cubrimientoNode.domNode, 'display', 'none');
            }
        },
        _templateIni : function () {
            var select, departamentosStore;
            departamentosStore = new Memory({
                data: [
                    {name: "Artigas", id: "G"},
                    {name: "Canelones", id: "A"},
                    {name: "Cerro Largo", id: "E"},
                    {name: "Colonia", id: "L"},
                    {name: "Durazno", id: "Q"},
                    {name: "Flores", id: "N"},
                    {name: "Florida", id: "O"},
                    {name: "Lavalleja", id: "P"},
                    {name: "Maldonado", id: "B"},
                    {name: "Montevideo", id: "V"},
                    {name: "Paysandu", id: "I"},
                    {name: "Rio Negro", id: "J"},
                    {name: "Paysandu", id: "I"},
                    {name: "Rivera", id: "F"},
                    {name: "Rocha", id: "C"},
                    {name: "Salto", id: "H"},
                    {name: "San Jose", id: "M"},
                    {name: "Soriano", id: "K"},
                    {name: "Tacuarembo", id: "R"},
                    {name: "Treinta y tres", id: "D"}
                ]
            });
            select = new FilteringSelect({
                name: "departamentos",
                placeHolder: "seleccione departamento",
                readonly: "True",
                onChange: lang.hitch(this, function (state) {
                    this._departamento = state;
                }),
                store: departamentosStore
            }, this._departamentosCombo);
            select.startup();
            var data = select.store.data;
            lang.hitch(this, this._initGrid());
            new CheckBox({
                name: "checkBox",
                value: "",
                checked: false,
                onChange: lang.hitch(this, function (b) {
                    this._mantenerGeom = b;
                })
            }, this._mantenerGeo).startup();
        },
        _buscarClick : function () {
            var i, departamento, padrones, padronesArreglo, query;
            departamento = this._departamento;
            if (this._id2Node.get("value")) {
                this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbBuscando;
                padrones = this._id2Node.get("value");
                padronesArreglo = padrones.split(" ");
                for (i = 0; i < padronesArreglo.length; i = i + 1) {
                    if (i === 0) {
                        query = "ID2='" + departamento + "-" + padronesArreglo[i] + " ' ";
                    } else {
                        query = query + "OR ID2='" + departamento + "-" + padronesArreglo[i] + " ' ";
                    }
                }
                this._query.where =  query;
                this._queryTask.execute(this._query, lang.hitch(this, this._queryTaskCallback),
                    lang.hitch(this, this._queryTaskErrback));
            } else {
                this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbIngresePadron;
            }
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
            if (results.features.length > 0) {
                arrayUtil.forEach(results.features, lang.hitch(this, function (feature, index) {
                    // Supongo que por resultado tiene que haber solo un padron
                    if (index === 0) {
                        ext = feature.geometry.getExtent();
                    } else {
                        ext = ext.union(feature.geometry.getExtent());
                    }
                    indice = feature.attributes.CODDEPTO + '-' + feature.attributes.PADRON;
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
            this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbErrorBuscar;
            return null;
        },
        _initGrid: function () {
            var grid, estructura;
            estructura = [[
                { name: "Departamento", field: this._gridFields.departamento, width: "86px" },
                { name: "Nro. Padrón", field: this._gridFields.padron, width: "84px" },
                { name: "Sup. Catastral (Has.)", field: this._gridFields.catastral, width: "115px" },
                { name: "Ind. Productividad", field: this._gridFields.productividad, width: "100px" },
                { name: "Ind. Valor Real", field: this._gridFields.valorreal, width: "100px" }
            ]];

            grid = new DataGrid({
                structure: estructura,
                rowSelector: '20px'
            });
                /*append the new grid to the div*/
            grid.placeAt(this._gridDiv);
                /*Call startup() to render the grid*/
            grid.startup();
            this._grid = grid;
            grid.on("SelectionChanged",
                            lang.hitch(this, this._reportSelection), true);
        },
        _reportSelection: function () {
            var capa, items;
            capa = this._cg3sr;
            this._store.query({}).forEach(function (padron) {
                capa.deseleccionarGrafico(padron.OBJECTID);
            });
            items = this._grid.selection.getSelected();
            baseArray.map(items, function (item) {
                this._cg3sr.seleccionarGrafico(item.OBJECTID);
                return item.OBJECTID;
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
        _croquis: function () {
            var padrones, items, params;
            padrones = "";
            items = this._grid.selection.getSelected();
            baseArray.map(items, function (item) {
                padrones += item.ID2 + " ";
            }, this);
            if (padrones) {
                params = {"Padrones": padrones};
                this._demo.startLoading();
                this.geoprocessor.submitJob(params, lang.hitch(this, this._completeCallback),
                    lang.hitch(this, this._statusCallback));
            } else {
                this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbErrorNoSeleccionCroquis;
            }

        },
        _cubrimientoWidget: function () {
            var padrones, items, dialogo;
            padrones = "";
            items = this._grid.selection.getSelected();
            baseArray.map(items, function (item, i) {
                if (i === 0) {
                    padrones += "ID2='" + item.ID2 + "'";
                } else {
                    padrones += "OR ID2='" + item.ID2 + "'";
                }
            }, this);
            if (padrones) {
                this._cubrimientoConeatWidget = new CubrimientoConeatWidget({mapa: this.mapa, capa: "ConsultaConeat", padrones: padrones});
                this._cubrimientoConeatWidget.startup();
                this._cubrimientoConeatWidget.show();
                dialogo = new Dialog({
                    title : "Porcentaje de Grupos Coneat",
                    style : "width: 280px",
                    content: this._cubrimientoConeatWidget
                });
                dialogo.startup();
                dialogo.show();

            } else {
                this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbErrorNoSeleccionCubrimiento;
            }
        },
        _setGrid: function (atributos) {
            var test_store, ingreso;
            ingreso = true;
            this._store.query({}).forEach(function (padron) {
                if (padron.OBJECTID === atributos.OBJECTID) {
                    ingreso = false;
                }
            });
            if (ingreso === true) {
                this._store.put(atributos);
                test_store = new ObjectStore({objectStore: this._store});
                this._grid.setStore(test_store);
            }
        },
        _completeCallback: function (jobInfo) {
            this.geoprocessor.getResultData(jobInfo.jobId, "Croquis", lang.hitch(this, this._displayResult));
        },
        _statusCallback: function () {
//            this._resultadoNode.innerHTML = jobInfo.jobStatus;
            return null;
        },
        _displayResult: function (results) {
            this._demo.endLoading();
            window.open(results.value.url);
        }
    });
    return widget;
});
