/*
 * js/snia/widgets/AyudaWidget
  */
/*global define, console, dijit*/
/*jslint nomen: true */
define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/AyudaWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/store/Memory",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dojo/domReady!"
], function (Evented, declare, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, domConstruct,
    Memory, Tree, ObjectStoreModel, ContentPane) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: true,
        resize : function () {
            if (this._bcAyuda) {
                this._bcAyuda.resize();
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
            config: null
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            this.options = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            //propiedades
            this.set("mapa", this.options.mapa);
            this.set("theme", this.options.theme);
            this.set("visible", this.options.visible);
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
                this._cargarDOM();
            }
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('AyudaWidget::requiere un mapa');
                }
                this._init();
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
            domConstruct.empty("prueba");  //elimino el div donde esta el tree
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
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
            this._bcAyuda.startup();
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _cargarDOM: function () {
            var titulo, bD1, bI1, imagen, contenido, seleccionado, rutaImg,
                div1, div2, link, model, governmentStore;
            bD1 = new ContentPane({  //Derecho
                region: "center",
                style: "height: 400px;"
            });
            this._cpDerSC.addChild(bD1);
            bI1 = new ContentPane({ //Izquierdo
                region: "center",
                style: "width: 180px; height: 400px;"
            });
            this._cpIzqSC.addChild(bI1);
            div1 = domConstruct.create('div', {}, bI1.containerNode);
            div2 = domConstruct.create('div', {}, bD1.containerNode);
            governmentStore = new Memory({
                data: this.options.config.data,
                getChildren: function (object) {
                    return this.query({parent: object.id});
                }
            });
            model = new ObjectStoreModel({
                store: governmentStore,
                childrenAttrs: ["children"],
                labelAttr: "name",
            // query to get root node
                query: {id: "root"}
            });
            declare(Tree._TreeNode, {
                _setLabelAttr: {node: "labelNode", type: "innerHTML"}
            });
            this._tree = new Tree({
                model: model,
                //dndController: dndSource,
                showRoot: false,
                //autoExpand: true,
//                persist: false,
               // openOnClick:true,
                style: function () {
                    return "disabled";
                },
                getLabelClass: function (item) {
                    if (item.parent === "root") {
                       // tree.autoExpand=true;
                        return "tree_root";
                    }//&& item.children
                },
                getIconClass: function () {
                    return "custimg";
                },
                onOpen: lang.hitch(this, function (item, node) {
                    var children, c, nodoItem, esPadre, negEsPadre;
                    var comun, i, j;
                    children = node.getChildren();
                    for (c in children) {
                        if (children.hasOwnProperty(c)) {
                            nodoItem = children[c].get('item');
                            esPadre =  nodoItem.esPadre;
                            negEsPadre = !esPadre;
                            if (this._tree && nodoItem && negEsPadre) {
                                this._tree._expandNode(children[c]);
                            }
                        }
                    }
                  
                }),
                onClick: lang.hitch(this, function () {
                    var comun, i, j;
                    comun = this._tree.get("selectedItems")[0].seccionContenido.elementos;
                    seleccionado = this._tree.get("selectedItems")[0].seccionContenido.titulo.Texto.Contenido;
                    titulo = "<p class=" + '"' + this._tree.get("selectedItems")[0].seccionContenido.titulo.Texto.Estilo + '"' + ">"
                            + seleccionado + "</p> <br>";
                    contenido = "";
                    for (i = 0; i < comun.length; i = i + 1) {
                        if (comun[i].Texto) {
                            for (j = 0; j < comun[i].Texto.length; j = j + 1) {
                                contenido = contenido + "<p class=" + '"' + comun[i].Texto[j].Estilo + '"' + ">" + comun[i].Texto[j].Contenido + "</p>" + " <br> ";
                            }
                        } else {
                            if (comun[i].Imagen) {
                                rutaImg = comun[i].Imagen.URL;
                                imagen = "<img src=" + '"' + rutaImg + '" ' + " width=" + '"' + comun[i].Imagen.Ancho + 'px"' + " height=" + '"' + comun[i].Imagen.Alto + 'px>"';
                                contenido = contenido + imagen + " <br> ";
                            } else {
                                if (comun[i].Enlace) {
                                    for (j = 0; j < comun[i].Enlace.length; j = j + 1) {
                                        link = "<a href=" + '"' + comun[i].Enlace[j].URL + '" ' + " target=" + '"' + "_blank" + '"' + ">" + comun[i].Enlace[j].Contenido + "</a><br>";
                                        contenido = contenido + link + " <br> ";
                                    }
                                }
                                else{
                                    if (comun[i].Video) {
                                        link = "<video src=" + '"' + comun[i].Video.URL + '" ' + "width=\"360\" height=\"300\"" + " controls></video><br>";
                                            contenido = contenido + link + " <br> ";
                                    }                                    
                                }
                            }
                        }
                    }
                    if (this._tree.get("selectedItems")[0].seccionContenido.titulo.Imagen) {
                        rutaImg = this._tree.get("selectedItems")[0].seccionContenido.titulo.Imagen.URL;
                        imagen = "<img src=" + '"' + rutaImg + '" ' + " width=" + '"' + "30px" + '"' + " height=" + '"' + "30px" + '" ' + titulo + " ";
                        contenido = contenido + "<br>  <br>";
                        div2.innerHTML = imagen + contenido;
                    } else {
                        div2.innerHTML = titulo + contenido;
                    }
                })
            }, domConstruct.create('div', {}, div1, "prueba"));
            this._tree.startup();
            this._tree.collapseAll();
            this._tree._expandNode(this._tree.getChildren()[0]);
        }
    });
    return widget;
});



