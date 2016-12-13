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
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dojox/grid/DataGrid",
    "dojo/data/ObjectStore",
    "dojo/_base/array",
    "dijit/Tooltip",
    "dojox/widget/Standby",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/domReady!"
], function (on, Evented, arrayUtil, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, i18n, domClass, domStyle,
    SpatialReference, CapaGrafica3SR, Query, QueryTask, Color, Graphic, SimpleLineSymbol, SimpleFillSymbol, Memory, FilteringSelect, CheckBox, TextBox,
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
            this._arrayFiltros = [];
            this._tipoFiltros = [];
            this._valoresFiltros = [];
            this._urlQuery = defaults.config.urlQuery;
            this._areasVisible = defaults.config.areasVisible;
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
            this._filtros = defaults.config.filtros;
            this._campoFiltro = defaults.config.campoFiltro;
            this._lblcampoFiltro = defaults.config.lblcampoFiltro;
            this._campoFiltro2 = defaults.config.campoFiltro2;
            this._lblcampoFiltro2 = defaults.config.lblcampoFiltro2;
            this._columnas = defaults.config.columnas;
            this._placeHoldFiltro = defaults.config.placeHoldFiltro;
            this._placeHoldFiltro2 = defaults.config.placeHoldFiltro2;
            this._standbyCount = 0;
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
            var TooltipAcercar, TooltipResultado, TooltipSeleccionarTodo;
            this._symbol = new SimpleFillSymbol("solid",
                new SimpleLineSymbol("solid", new Color([0, 255, 255, 0.8]), 2), null);
            this._cg3sr = new CapaGrafica3SR({ id: "buscarLayer" });
            this._cg3sr.agregarMapa(this.mapa);
            this._queryTask = new QueryTask(this._urlQuery);
            this._query = new Query();
            this._query.outSpatialReference = new SpatialReference(this.mapa.map.spatialReference.wkid);
            this._query.returnGeometry = false;
            this._query.outFields = ["*"];
            this._query.returnDistinctValues = true;
            this._queryCombo();
            this._store = new Memory();
            this._visible();
            this._activar();
            this.set("loaded", true);
            this.emit("load", {});
            lang.hitch(this, this._templateIni());
            this._cg3sr.limpiar();
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
            var  divEtiqueta, filtro, divfiltro, storeFiltro;
            // itero en todos los filtros y los agrego programaticamente
            arrayUtil.forEach(this._filtros, lang.hitch(this, function (feature, index) {
                this._tipoFiltros[index] = feature.tipo;
                storeFiltro = new Memory({});
                divEtiqueta = domConstruct.create("div", { innerHTML: feature.lblcampoFiltro + "&nbsp&nbsp"});
//                domAttr.set(divEtiqueta, "innerHTML", feature.lblcampoFiltro+ "<br></br>");
                divfiltro = domConstruct.create("div");
                domConstruct.place(divfiltro, divEtiqueta);
                domConstruct.place(divEtiqueta, this._principal, "before");
                if (feature.combo === 1) {
                    filtro = new FilteringSelect({
                        name: feature.campoFiltro,
                        placeHolder: feature.placeHoldFiltro,
                        readonly: "True",
                        id: index,
    //                    required :"False",
                        onChange: lang.hitch(this, function (state) {
                            lang.hitch(this, this._cambioComboTexto(state, index));
                        }),
                        store: storeFiltro
                    }, divfiltro);
                    filtro.startup();
                } else {
                    filtro = new TextBox({
                        name: "firstname",
                        value: "",
                        placeHolder: feature.placeHoldFiltro
                    }, divfiltro);
                    this.own(
                        on(filtro, "Change", lang.hitch(this, function (state) {
                            this._cambioComboTexto(state, index);
                        })
                            )
                    );
                }
                this._arrayFiltros.push({filtro: filtro, id: index });
            }));
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
        _queryCombo : function () {
            arrayUtil.forEach(this._filtros, lang.hitch(this, function (feature) {
                if (feature.dependencia === 0) {
                    this._standbyCount = this._standbyCount + 1;
                    this._query.outFields = [feature.campoFiltro];
                    this._query.where = " 1 = 1 ";
                    this._queryTask.execute(this._query, lang.hitch(this, this._queryTaskCallbackCombo),
                        lang.hitch(this, this._queryTaskErrbackCombo));
                }
            }));
        },
        _buscarClick : function () {
            var query;
            this._resultadoNode.innerHTML = this._i18n.widgets.BuscarWidget.lbBuscando;
            this._query.returnGeometry = true;
            this._query.outFields = ["*"];
            this._query.returnDistinctValues = false;
            arrayUtil.forEach(this._filtros, lang.hitch(this, function (feature, index) {
                var elementos = this._valoresFiltros[index].state.split(" ");
                if (index === 0) {
                    if (this._tipoFiltros[index] === "numero") {
                        query = feature.campoFiltro + "=" + this._valoresFiltros[index].state;
                    } else {
                         for (var i = 0; i < elementos.length; i = i + 1) {
                             if (i === 0) {
                                query = feature.campoFiltro + "='" + elementos[i] + "'";
                            } else {
                                query = query + " OR " + feature.campoFiltro + "='" +  elementos[i] + "'";
                            }                             
                         }                        
                      //  query = feature.campoFiltro + "='" + this._valoresFiltros[index].state + "'";
                    }
                } else {
                    if (this._tipoFiltros[index] === "numero") {
                        query += " and " + feature.campoFiltro + "=" + this._valoresFiltros[index].state;
                    } else {
                        query += " and " + feature.campoFiltro + "='" + this._valoresFiltros[index].state + "'";
                    }
                }
            }));
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
                    extent = extent.union(capa.getGrafico(item["gis.SIGRENARE.CAT_PadronesRuralesConeat.OBJECTID"]).grafico(this.mapa.map.spatialReference.wkid).geometry.getExtent());
                } else {
                    extent = capa.getGrafico(item["gis.SIGRENARE.CAT_PadronesRuralesConeat.OBJECTID"]).grafico(this.mapa.map.spatialReference.wkid).geometry.getExtent();
                }
                return item["gis.SIGRENARE.CAT_PadronesRuralesConeat.OBJECTID"];
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
                capa.removerGrafico(item["gis.SIGRENARE.CAT_PadronesRuralesConeat.OBJECTID"]);
                this._store.remove(item["gis.SIGRENARE.CAT_PadronesRuralesConeat.OBJECTID"]);
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
                var cont =0;
               
                arrayUtil.forEach(results.features, lang.hitch(this, function (feature, index) {
                    // Supongo que por resultado tiene que haber solo un padron
                   var a = results.features[cont];
                   while (cont < results.features.length){
                       
                      cont ++; 
                   }
                   
                    if (index === 0) {
                        ext = feature.geometry.getExtent();
                    } else {
                        ext = ext.union(feature.geometry.getExtent());
                    }
                    indice = feature.attributes["gis.SIGRENARE.CAT_PadronesRuralesConeat.OBJECTID"];
                    feature.attributes["gis.SIGRENARE.CAT_PadronesRuralesConeat.OBJECTID"] = indice;
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
            var indice, storeFiltro;
            storeFiltro = new Memory({});
            this._standbyCount = this._standbyCount - 1;
            if (this._standbyCount === 0) {
                this._standby.hide();
            }
            arrayUtil.forEach(this._filtros, lang.hitch(this, function (filtro, index) {
                if (results.fields[0].name === filtro.campoFiltro) {
                    if (results.features.length > 0) {
                        arrayUtil.forEach(results.features, lang.hitch(this, function (feature, id) {
                            indice = id;
                            feature.attributes.OBJECTID = indice;
                            feature.attributes.id = indice;
                            storeFiltro.put({id: feature.attributes[filtro.campoFiltro], name: feature.attributes[filtro.campoFiltro]});
                        }));
                        this._arrayFiltros[index].filtro.store = storeFiltro;
                    } else {
                        this._arrayFiltros[index].filtro.store = storeFiltro;
                    }
                }
            }));
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
        },
        _cambioComboTexto: function (state, index) {
            this._valoresFiltros[index] = {state: state, id: index };
            this._valor = state;
            //Cada vez que hay un cambio, se recorren todos los filtros a partir del cual hubo cambio
            // Por cada filtro de esta iteracion, se buscan todos los acumulados hasta este para re armar su contenido
            // incluyendo asi el cambio
            // index = id del cambio
            // index2 = id del filtro que voy a hacer el acumulado
            // index3 = iterador que va acumulando
            arrayUtil.forEach(this._filtros, lang.hitch(this, function (feature, index2) {
                var  acumulado, primera;
                acumulado = "";
                primera = 0;
                if ((index2 > index) && (feature.dependencia === 1 || feature.combo === 1)) {
                // Por cada combo que tiene dependencia, busco los acumulados hasta este.    
                    arrayUtil.forEach(this._filtros, lang.hitch(this, function (feature, index3) {
                        if ((index3 < index2) && (this._valoresFiltros[index3])) {
                            if (primera === 0) {
                                if (this._tipoFiltros[index3] === "numero") {
                                    acumulado = feature.campoFiltro + "  =" + this._valoresFiltros[index3].state;
                                } else {
                                    acumulado = feature.campoFiltro + "  = '" + this._valoresFiltros[index3].state + "'";
                                }
                                primera = 1;
                            } else {
                                if (this._tipoFiltros[index3] === "numero") {
                                    acumulado += " and " + feature.campoFiltro + " = " + this._valoresFiltros[index3].state;
                                } else {
                                    acumulado += " and " + feature.campoFiltro + " = '" + this._valoresFiltros[index3].state + "'";
                                }
                            }
                        }
                    }));
                    this._standbyCount = this._standbyCount + 1;
                    this._query.outFields = [feature.campoFiltro];
                    this._query.where = " 1 = 1 and " + acumulado;
                    this._queryTask.execute(this._query, lang.hitch(this, this._queryTaskCallbackCombo),
                        lang.hitch(this, this._queryTaskErrbackCombo));
                }
            }));
        }
    });
    return widget;
});
