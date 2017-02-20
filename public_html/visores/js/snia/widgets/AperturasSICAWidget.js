/*
 * js/snia/widgets/AperturasSICAWidget
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
    "dijit/a11yclick",
    "dojo/text!./templates/AperturasSICAWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/store/Memory",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "dijit/layout/ContentPane",
    "modulos/wkids",
    "dojox/grid/DataGrid",
    "dojo/data/ObjectStore",
    "dojo/data/ItemFileWriteStore",
    "dojo/domReady!"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, i18n, domClass, domStyle, domConstruct,
    Memory, Tree, ObjectStoreModel, ContentPane,
    wkids, DataGrid, ObjectStore, ItemFileWriteStore) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: true,
        resize : function () {
            if (this._bcAperturas) {
                this._bcAperturas.resize();
            }
            if (this._cpIzq) {
                this._cpIzq.resize();
            }
            if (this._cpDerSC) {
                this._cpDerSC.resize();
            }
            if (this._cpIzqSC) {
                this._cpIzqSC.resize();
            }
            if (this._grid) {
                this._grid.resize();
            }
            if (this._cpTabla) {
                this._cpTabla.resize();
            }
        },
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            data: null,
            aperturas: null,
            config: {}
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
            this.set("config", defaults.config);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
            this._data = defaults.data;
            this._config = defaults.config;
            this._aperturas = defaults.aperturas;
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this._cargarJSON();
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('AperturasSICAWidget::requiere un mapa');
            }
            //  mapa cargado
            if (this.mapa.loaded) {
                this._init();
            } else {
                on.once(this.mapa, "load", lang.hitch(this, function () {
                    this._init();
                }));
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
        desactive : function () {},
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
        _cargarJSON: function () {
            var bD1, bI1, div1, i;
            bD1 = new ContentPane({  //Derecho
                region: "center",
                style: "width: 280px; height: 400px;"
            });
            this._cpDerSC.addChild(bD1);
            bI1 = new ContentPane({ //Izquierdo
                region: "center",
                style: "width: 280px; height: 400px;"
            });
            this._cpIzqSC.addChild(bI1);
            div1 = domConstruct.create('div', {}, bI1.containerNode);
            
            this._store = new Memory({
                data: [{ name: "raiz", id: "root"}],
                getChildren: function (object) {
                    return this.query({parent: object.id});
                }
            });
            for (i = 0; i < this._aperturas.length; i = i + 1) {
                this._store.put({id: i, name: this._aperturas[i].label, parent: "root", nodo: "raiz" });
            }
            this._myModel = new ObjectStoreModel({
                store: this._store,
                query: {id:  "root"}
            });
            this._tree = new Tree({
                model: this._myModel,
                showRoot: false,
                openOnClick: true,
                autoExpand: true,
                getIconClass: function () {
                    return "custimg";
                },
                onOpen: lang.hitch(this, function (item, node) {
                    var children, c, nodoItem, esHijo;
                    children = node.getChildren();
                    for (c in children) {
                        if (children.hasOwnProperty(c)) {
                            nodoItem = children[c].get('item');
                            esHijo = nodoItem.nodo.toString() === "hijo";
                            if (this._tree && nodoItem && !esHijo) {
                                this._tree._expandNode(children[c]);
                            }
                        }
                    }
                }),
                onClick: lang.hitch(this, this._treeClick)
            });
            this._tree.placeAt(div1);
            this._tree.startup();
        },
        _treeClick : function (item) {
            this._cpTabla.containerNode.innerHTML = " ";
            this._cpTabla.containerNode.innerText = " ";
            var titulo, complete = false, i, j, a, layout = [], data = { items: []  }, myNewItem, totalNum, num = 0, hectareas = 0, totalHec;;
            titulo = "<p class= \"Titulo1\">" + item.name + "</p>";
            this._grid = " ";
             //this._data - el json que me pasa Fabi
//            // this._aperturas  - mi json con lo que tengo buscar en el data
            for (i = 0; i < this._data.Cruces.length; i = i + 1) {
                for (j = 0; j < this._aperturas.length; j = j + 1) {
                    if (this.config.data[i].nombre === this._aperturas[j].label && item.name === this._aperturas[j].label) {
//                        //estoy en la apertura a recorrer
                        this._tabla = "<p>" + this.config.data[i].tituloTabla + "</p>";
                        this._store = new ItemFileWriteStore({data: data});
                       layout = [{cells: [[], [], []], onBeforeRow: function(inDataIndex, inSubRows){inSubRows[0].invisible = true; }}]; 
                        for (a = 0; a < this.config.data[i].cantCol; a = a + 1) {                            
                            layout[0].cells[0].push({width: 10});
                        }
                        for (a = 0; a < this.config.data[i].divisiones.length; a = a + 1) {
                            layout[0].cells[1].push({name: this.config.data[i].divisiones[a], field: "", colSpan: this.config.data[i].subDiv[a]});
                        }
                        for (a = 0; a < this.config.data[i].columnas.length; a = a + 1) {
                            layout[0].cells[2].push({name: this.config.data[i].columnas[a], field : this.config.data[i].columnasField[a],  width: this.config.data[i].columnasW[a]});
                        }
                        this._divTitulo.innerHTML = "<div style = \"width:500px\" >" + titulo + this._tabla + "<br></div> ";
                        this._grid = new DataGrid({
                            store: this._store,
                            structure: layout,
                            rowSelector: '10px'
                        });
                        this._grid.placeAt(this._cpTabla);
                        for (a = 0; a < this.config.data[i].filas.length; a = a + 1) {
                            switch (this._aperturas[j].nombre) {
                            case "Apertura1":
                                totalNum = this._data.Cruces[i].Apertura1[0][0];
                                totalHec = this._data.Cruces[i].Apertura1[0][1];
                                if (totalNum !== 0) { num = this._data.Cruces[i].Apertura1[a][0] * 100 / totalNum; }
                                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura1[a][1] * 100 / totalHec; }
                                myNewItem = {Ap1: this.config.data[i].filas[a], Num: this._data.Cruces[i].Apertura1[a][0], PorcN: num.toFixed(0), Hect: this._data.Cruces[i].Apertura1[a][1], PorcH: hectareas.toFixed(0)};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura2":
                                totalHec = this._data.Cruces[i].Apertura2[0];
                                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura2[a] * 100 / totalHec; }
                                myNewItem = {Ap2: this.config.data[i].filas[a], Hect: this._data.Cruces[i].Apertura2[a], Porc: hectareas.toFixed(0)};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura4":
                                myNewItem = {Ap4: this.config.data[i].filas[a], ne: this._data.Cruces[i].Apertura4[a][0], se: this._data.Cruces[i].Apertura4[a][1], Total: this._data.Cruces[i].Apertura4[a][2], Toros: this._data.Cruces[i].Apertura4[a][3], VyV : this._data.Cruces[i].Apertura4[a][4], Vi: this._data.Cruces[i].Apertura4[a][5], Nov3: this._data.Cruces[i].Apertura4[a][6], Nov2: this._data.Cruces[i].Apertura4[a][7], Nov1: this._data.Cruces[i].Apertura4[a][8], Vaq2: this._data.Cruces[i].Apertura4[a][9], Vaq1: this._data.Cruces[i].Apertura4[a][10], Ter: this._data.Cruces[i].Apertura4[a][11], Buey: this._data.Cruces[i].Apertura4[a][12]};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura5":
                                myNewItem = {Ap5: this.config.data[i].filas[a], ne: this._data.Cruces[i].Apertura5[a][0], se: this._data.Cruces[i].Apertura5[a][1], Total: this._data.Cruces[i].Apertura5[a][2], Carn: this._data.Cruces[i].Apertura5[a][3], OveCria : this._data.Cruces[i].Apertura5[a][4], OvCons: this._data.Cruces[i].Apertura5[a][5], Borr2: this._data.Cruces[i].Apertura5[a][6], CordA: this._data.Cruces[i].Apertura5[a][7], CordO: this._data.Cruces[i].Apertura5[a][8], CordM: this._data.Cruces[i].Apertura5[a][9]};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura6":
                                myNewItem = {Ap6: this.config.data[i].filas[a], ne: this._data.Cruces[i].Apertura6[a][0], se: this._data.Cruces[i].Apertura6[a][1], total: this._data.Cruces[i].Apertura6[a][2], vs: this._data.Cruces[i].Apertura6[a][3], vo : this._data.Cruces[i].Apertura6[a][4], tm: this._data.Cruces[i].Apertura6[a][5], pl: this._data.Cruces[i].Apertura6[a][6]};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura7":
                                totalNum = this._data.Cruces[i].Apertura7[0][0];
                                totalHec = this._data.Cruces[i].Apertura7[0][1];
                                if (totalNum !== 0) { num = this._data.Cruces[i].Apertura7[a][0] * 100 / totalNum; }
                                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura7[a][1] * 100 / totalHec; }
                                myNewItem = {Ap7: this.config.data[i].filas[a], nro: this._data.Cruces[i].Apertura7[a][0], pocN: num.toFixed(0), hect: this._data.Cruces[i].Apertura7[a][1], nroH: hectareas.toFixed(0)};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura8":
                                myNewItem = {Ap8: this.config.data[i].filas[a], total: this._data.Cruces[i].Apertura8[a][0], enProd: this._data.Cruces[i].Apertura8[a][1], nt: this._data.Cruces[i].Apertura8[a][2], np: this._data.Cruces[i].Apertura8[a][3], mt: this._data.Cruces[i].Apertura8[a][4], mp: this._data.Cruces[i].Apertura8[a][5], lt: this._data.Cruces[i].Apertura8[a][6], lp: this._data.Cruces[i].Apertura8[a][7], pt: this._data.Cruces[i].Apertura8[a][8], pp: this._data.Cruces[i].Apertura8[a][9], qt: this._data.Cruces[i].Apertura8[a][10], qp: this._data.Cruces[i].Apertura8[a][11]};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura9":
                                myNewItem = {Ap9: this.config.data[i].filas[a], tot: this._data.Cruces[i].Apertura9[a][0], ep: this._data.Cruces[i].Apertura9[a][1], mat: this._data.Cruces[i].Apertura9[a][2], map: this._data.Cruces[i].Apertura9[a][3], pt: this._data.Cruces[i].Apertura9[a][4], pp: this._data.Cruces[i].Apertura9[a][5], mt: this._data.Cruces[i].Apertura9[a][6], mp: this._data.Cruces[i].Apertura9[a][7], dt: this._data.Cruces[i].Apertura9[a][8], dp: this._data.Cruces[i].Apertura9[a][9], pet: this._data.Cruces[i].Apertura9[a][10], pep: this._data.Cruces[i].Apertura9[a][11], ct: this._data.Cruces[i].Apertura9[a][12], cp: this._data.Cruces[i].Apertura9[a][13], at: this._data.Cruces[i].Apertura9[a][14], ap: this._data.Cruces[i].Apertura9[a][15], ot: this._data.Cruces[i].Apertura9[a][16], op: this._data.Cruces[i].Apertura9[a][17]};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura13":
                                myNewItem = {Ap13: this.config.data[i].filas[a], t: this._data.Cruces[i].Apertura13[a][0], mez: this._data.Cruces[i].Apertura13[a][1], al: this._data.Cruces[i].Apertura13[a][2], lc: this._data.Cruces[i].Apertura13[a][3], fes: this._data.Cruces[i].Apertura13[a][4], op: this._data.Cruces[i].Apertura13[a][5]};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura14":
                                myNewItem = {Ap14: this.config.data[i].filas[a], Total: this._data.Cruces[i].Apertura14[a][0], mez: this._data.Cruces[i].Apertura14[a][1], tb: this._data.Cruces[i].Apertura14[a][2], lr: this._data.Cruces[i].Apertura14[a][3], lm: this._data.Cruces[i].Apertura14[a][4], op: this._data.Cruces[i].Apertura14[a][5]};
                                this._store.newItem(myNewItem);
                                break;
                            case "Apertura18":
                                totalNum = this._data.Cruces[i].Apertura18[0][0];
                                totalHec = this._data.Cruces[i].Apertura18[0][1];
                                if (totalNum !== 0) { num = this._data.Cruces[i].Apertura18[a][0] * 100 / totalNum; }
                                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura18[a][1] * 100 / totalHec; }
                                myNewItem = {Ap18: this.config.data[i].filas[a], nro: this._data.Cruces[i].Apertura18[a][0], porcN: num.toFixed(0), hec: this._data.Cruces[i].Apertura18[a][1], porcH: hectareas.toFixed(0)};
                                this._store.newItem(myNewItem);
                                break;
                            }
                        }
                        complete = true;
                        this._grid.startup();
                    }
                }
            }
        },
        _visible: function () {
            if (this.get("visible")) {
                domStyle.set(this.domNode, 'display', 'block');
            } else {
                domStyle.set(this.domNode, 'display', 'none');
            }
        },
        _init: function () {
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
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
