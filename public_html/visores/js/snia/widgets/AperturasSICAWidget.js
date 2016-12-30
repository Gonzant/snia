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
    "dijit/layout/BorderContainer",
    "modulos/Grafico3SR",
    "modulos/wkids",
    "dojox/grid/DataGrid",
    "dojo/data/ObjectStore",
    "dojo/data/ItemFileWriteStore",
    "dojo/dom",
    "dojo/domReady!"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, i18n, domClass, domStyle, domConstruct,
    Memory, Tree, ObjectStoreModel, ContentPane,BorderContainer,
    Grafico3SR, wkids, DataGrid, ObjectStore, ItemFileWriteStore, dom) {
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
            if (this._grid) {
                this._grid.resize();
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
            this._grid = " ";           
            this._tabla = "<table class= \"gridSica\">";
//            //this._data - el json que me pasa Fabi
//            // this._aperturas  - mi json con lo que tengo buscar en el data
            for (i = 0; i < this._data.Cruces.length; i = i + 1) {
                for (j = 0; j < this._aperturas.length; j = j + 1) {
                    if (this.config.data[i].nombre === this._aperturas[j].label && item.name === this._aperturas[j].label) {
//                        //estoy en la apertura a recorrer
                        contenido =  "<tr><td style= \"color:black;\" colspan=" + "'" + this.config.data[i].cantCol + "'>" + this.config.data[i].tituloTabla + "</td></tr>";
                        tr = "<tr class = \"dojoxGridHeaderE\">";
                        for (a = 0; a < this.config.data[i].divisiones.length; a = a + 1) {
                            tr = tr + "<td colspan=" + "'" + (this.config.data[i].subDiv[a]) + "'>" + this.config.data[i].divisiones[a] + "</td>";
                        }
                        this._tabla = this._tabla + contenido + tr + "</tr>" + "</table>"; 
                        var data = { items: []  };
                        this._store = new ItemFileWriteStore({data: data});
                        var layout = [], ap = new Object(), l = [], l2=[];
                        for (a = 0; a < this.config.data[i].columnas.length; a = a + 1) {
                            ap = new Object();
                            ap.name =  this.config.data[i].columnas[a];
                            ap.field =  this.config.data[i].columnasField[a];
                            ap.width =  this.config.data[i].columnasW[a];
                            l.push(ap);
                        }
                        
                        for (a = 0; a < this.config.data[i].divisiones.length; a = a + 1) {
                            ap = new Object();
                            ap.name =  this.config.data[i].divisiones[a];
                            ap.field =  this.config.data[i].divisiones[a];
                            ap.width =  this.config.data[i].divisiones[a];
                            l2.push(ap);
                        }
                        layout.push(l);
                        this._grid = new DataGrid({
                            store: this._store,
                            structure: layout,
                            rowSelector: '20px'
                        });                      
                        this._div2.innerHTML = titulo + this._tabla + " ";
                        this._grid .placeAt(this._div2);
                                              
                    for (a = 0; a < this.config.data[i].filas.length; a = a + 1) {  
                        var myNewItem, a, totalNum, num = 0, hectareas = 0, totalHec;
                        switch (this._aperturas[j].nombre) {
                        case "Apertura1":   
                            totalNum = this._data.Cruces[i].Apertura1[0][0];
                            totalHec = this._data.Cruces[i].Apertura1[0][1];
                            if (totalNum !== 0) { num = this._data.Cruces[i].Apertura1[a][0] * 100 / totalNum; }
                            if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura1[a][1] * 100 / totalHec; }
                            myNewItem = {Ap1: this.config.data[i].filas[a], Num: this._data.Cruces[i].Apertura1[a][0], PorcN: num.toFixed(0), Hect:this._data.Cruces[i].Apertura1[a][1] ,PorcH: hectareas.toFixed(0)};
                            this._store.newItem(myNewItem);   
                            break;
                        case "Apertura2":
                            totalHec = this._data.Cruces[i].Apertura2[0];
                             if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura2[a] * 100 / totalHec; }
                            myNewItem = {Ap2: this.config.data[i].filas[a], Hect: this._data.Cruces[i].Apertura2[a], Porc:hectareas.toFixed(0)};
                             this._store.newItem(myNewItem);
                            break;
                        case "Apertura4":
                            myNewItem = {Ap4: this.config.data[i].filas[a], ne:this._data.Cruces[i].Apertura4[a][0], se: this._data.Cruces[i].Apertura4[a][1], Total: this._data.Cruces[i].Apertura4[a][2], Toros: this._data.Cruces[i].Apertura4[a][3], VyV :this._data.Cruces[i].Apertura4[a][4] ,Vi: this._data.Cruces[i].Apertura4[a][5], Nov3: this._data.Cruces[i].Apertura4[a][6], Nov2:this._data.Cruces[i].Apertura4[a][7], Nov1:this._data.Cruces[i].Apertura4[a][8], Vaq2:this._data.Cruces[i].Apertura4[a][9], Vaq1:this._data.Cruces[i].Apertura4[a][10], Ter:this._data.Cruces[i].Apertura4[a][11], Buey:this._data.Cruces[i].Apertura4[a][12]};
                            this._store.newItem(myNewItem); 
                            break;
                        case "Apertura5":
                            myNewItem = {Ap5: this.config.data[i].filas[a], ne:this._data.Cruces[i].Apertura5[a][0], se: this._data.Cruces[i].Apertura5[a][1], Total: this._data.Cruces[i].Apertura5[a][2], Carn: this._data.Cruces[i].Apertura5[a][3], OveCria :this._data.Cruces[i].Apertura5[a][4] ,OvCons: this._data.Cruces[i].Apertura5[a][5], Borr2: this._data.Cruces[i].Apertura5[a][6], CordA:this._data.Cruces[i].Apertura5[a][7], CordO:this._data.Cruces[i].Apertura5[a][8], CordM:this._data.Cruces[i].Apertura5[a][9]};
                            this._store.newItem(myNewItem);  
                            break;
                        case "Apertura6":
                            myNewItem = {Ap6: this.config.data[i].filas[a], ne:this._data.Cruces[i].Apertura6[a][0], se: this._data.Cruces[i].Apertura6[a][1], total: this._data.Cruces[i].Apertura6[a][2], vs: this._data.Cruces[i].Apertura6[a][3], vo :this._data.Cruces[i].Apertura6[a][4], tm: this._data.Cruces[i].Apertura6[a][5], pl: this._data.Cruces[i].Apertura6[a][6]};
                            this._store.newItem(myNewItem);  
                            break;
                        case "Apertura7":
                            totalNum = this._data.Cruces[i].Apertura7[0][0];
                            totalHec = this._data.Cruces[i].Apertura7[0][1];
                            if (totalNum !== 0) { num = this._data.Cruces[i].Apertura7[a][0] * 100 / totalNum; }
                            myNewItem = {Ap7: this.config.data[i].filas[a], nro: this._data.Cruces[i].Apertura7[a][0] , pocN: num.toFixed(0)};
                            this._store.newItem(myNewItem); 
                            break;
                        case "Apertura8":
                            myNewItem = {total: this.config.data[i].filas[a], enProd: this._data.Cruces[i].Apertura8[a][0], nt: this._data.Cruces[i].Apertura8[a][1], np: this._data.Cruces[i].Apertura8[a][2], mt: this._data.Cruces[i].Apertura8[a][3], mp: this._data.Cruces[i].Apertura8[a][4], lt: this._data.Cruces[i].Apertura8[a][5], lp: this._data.Cruces[i].Apertura8[a][6], pt: this._data.Cruces[i].Apertura8[a][7], pp: this._data.Cruces[i].Apertura8[a][8], qt: this._data.Cruces[i].Apertura8[a][9], qp: this._data.Cruces[i].Apertura8[a][10]};
                            this._store.newItem(myNewItem);  
                            break;
                        case "Apertura9":
                            myNewItem = {total: this.config.data[i].filas[a]};
                            this._store.newItem(myNewItem); 
                            break;
                        case "Apertura13":
                           myNewItem = {total: this.config.data[i].filas[a]};
                           this._store.newItem(myNewItem);
                            break;
                        case "Apertura14":
                            myNewItem = {total: this.config.data[i].filas[a]};
                            this._store.newItem(myNewItem);  
                            break;
                        case "Apertura18":
                            myNewItem = {total: this.config.data[i].filas[a]};
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
