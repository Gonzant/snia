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
    "dojo/text!./templates/AperturasSICAWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/store/Memory",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "esri/graphic",
    "modulos/Grafico3SR",
    "modulos/wkids",
    "dojox/grid/DataGrid",
    "dojo/data/ObjectStore",
    "dojo/data/ItemFileWriteStore",
    "dojo/domReady!"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, domConstruct,
    Memory, Tree, ObjectStoreModel, ContentPane,
    Graphic, Grafico3SR, wkids, DataGrid, ObjectStore, ItemFileWriteStore) {
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
            if (this._cpIzqSC) {
                this._cpIzqSC.resize();
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
        desactive : function () {
        },
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
        _cargarJSON: function () {
            var bD1, bI1, div1, i;
            bD1 = new ContentPane({  //Derecho
                region: "center",
                style: "height: 400px;"
            });
            this._cpDerSC.addChild(bD1);
            bI1 = new ContentPane({ //Izquierdo
                region: "center",
                style: "width: 280px; height: 400px;"
            });
            this._cpIzqSC.addChild(bI1);
            div1 = domConstruct.create('div', {}, bI1.containerNode);
            this._div2 = domConstruct.create('div', {}, bD1.containerNode);
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
            var contenido, titulo, complete = false, i, j, tr, a;
            titulo = "<p class= \"Titulo1\">" + item.name + "</p>";
            this._tabla = " ";
            this._tabla = "<table class= \"gridSica\">";
            //this._data - el json que me pasa Fabi
            // this._aperturas  - mi json con lo que tengo buscar en el data
            for (i = 0; i < this._data.Cruces.length; i = i + 1) {
                for (j = 0; j < this._aperturas.length; j = j + 1) {
                    if (this.config.data[i].nombre === this._aperturas[j].label && item.name === this._aperturas[j].label) {
                        //estoy en la apertura a recorrer
                        contenido =  "<tr><td colspan=" + "'" + this.config.data[i].cantCol + "'>" + this.config.data[i].tituloTabla + "</td></tr>";
                        tr = "<tr>";
                        for (a = 0; a < this.config.data[i].divisiones.length; a = a + 1) {
                            tr = tr + "<td colspan=" + "'" + (this.config.data[i].subDiv[a]) + "'>" + this.config.data[i].divisiones[a] + "</td>";
                        }
                        tr = tr + "</tr>";
                        for (a = 0; a < this.config.data[i].columnas.length; a = a + 1) {
                            tr = tr + "<td>" + this.config.data[i].columnas[a] + "</td>";
                        }
                        tr = tr + "</tr>";
                        switch (this._aperturas[j].nombre) {
                        case "Apertura1":
                            this._cargarApertura1(i, contenido, tr);
                            break;
                        case "Apertura2":
                            this._cargarApertura2(i, contenido, tr);
                            break;
                        case "Apertura4":
                            this._cargarApertura4(i, contenido, tr);
                            break;
                        case "Apertura5":
                            this._tabla = this._tabla + contenido + tr;
                            break;
                        case "Apertura6":
                            this._tabla = this._tabla + contenido + tr;
                            break;
                        case "Apertura7":
                            this._tabla = this._tabla + contenido + tr;
                            break;
                        }
                        complete = true;
                    }
                }
            }
            this._tabla = this._tabla + "</table>";
            this._div2.innerHTML = titulo + this._tabla + " ";
        },
        _cargarApertura1 : function (i, contenido, tr) {
            var a, totalNum = this._data.Cruces[i].Apertura1[0][0], num = 0, hectareas = 0, totalHec = this._data.Cruces[i].Apertura1[0][1];
            for (a = 0; a < this.config.data[i].filas.length; a = a + 1) {
                if (totalNum !== 0) { num = this._data.Cruces[i].Apertura1[a][0] * 100 / totalNum; }
                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura1[a][1] * 100 / totalHec; }
                tr = tr + "<tr><td>" + this.config.data[i].filas[a] + "</td><td>" + this._data.Cruces[i].Apertura1[a][0] + "</td><td>" + num.toFixed(0) + "</td><td>" + this._data.Cruces[i].Apertura1[a][1] + "</td><td>" + hectareas.toFixed(0) + "</td></tr>";
            }
            this._tabla = this._tabla + contenido + tr;
        },
        _cargarApertura2 : function (i, contenido, tr) {
            var a, hectareas = 0, totalHec = this._data.Cruces[i].Apertura2[0];
            for (a = 0; a < this.config.data[i].filas.length; a = a + 1) {
                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura2[a] * 100 / totalHec; }
                tr = tr + "<tr><td>" + this.config.data[i].filas[a] + "</td><td>" + this._data.Cruces[i].Apertura2[a] + "</td><td>" + hectareas.toFixed(0) + "</td></tr>";
            }
            this._tabla = this._tabla + contenido + tr;
        },
        _cargarApertura4 : function (i, contenido, tr) {
            var a;
            for (a = 0; a < this.config.data[i].filas.length; a = a + 1) { }
            this._tabla = this._tabla + contenido + tr;
        },
        _cargarApertura5 : function (i, contenido, tr) {
            this._tabla = this._tabla + contenido + tr;
        },
        _cargarApertura6 : function (i, contenido, tr) {
            this._tabla = this._tabla + contenido + tr;
        },
        _cargarApertura7 : function (i, contenido, tr) {
            for (var a = 0; a < this.config.data[i].filas.length; a = a + 1){ }
            this._tabla = this._tabla + contenido + tr; 
        },
        _cargarApertura8 : function (i, contenido, tr){},
        _cargarApertura9 : function (i, contenido, tr){},
        _cargarApertura13 : function (i, contenido, tr){},
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
