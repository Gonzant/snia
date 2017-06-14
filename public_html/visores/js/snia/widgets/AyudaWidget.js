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
            this.set("estilo", this.options.estilo);
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
                    var children, c, nodoItem, esPadre, negEsPadre, comun, i, j, contenido, titulo;
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
                    if (this.options.config.data[0].titulo === "Fruticultura") {
                        contenido = "<p class=\"Normal\">Servicio de consulta del programa 'Manejo Regional de Plagas' para el monitoreo de plagas de frutales de hoja caduca. Dirigido a autoridades del Ministerio de Agricultura Ganadería y Pesca, productores que integran el programa y a técnicos autorizados.</p> <p class=\"Titulo2\">Tutorial de uso de la herramienta</p><video src=\"../js/snia/videos/VisorMRP.mp4\" width=\"360\" height=\"240\" controls></video>";
                        titulo = "<p class=\"Titulo1\">Introducción</p>";
                        
                        div2.innerHTML = titulo + contenido;                             
                    }
//                   if(this.options.config.data[0].titulo === "Estadisticas" ){
//                       var comun =  this.options.config.data[1];
//                        var contenido ="<p></p>"; //"<p>"+ comun.seccionContenido.elementos[0].Texto[0].Contenido + "</p>" ;
//                        var titulo = "<p class=\"Titulo1\">Uruguay</p>";
//                        div2.innerHTML = titulo + contenido;                             
//                   }
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
                                contenido = contenido + "<p class=" + '"' + comun[i].Texto[j].Estilo + '"' + ">" + comun[i].Texto[j].Contenido + "</p>";
                            }
                        } else {
                            if (comun[i].Imagen) {
                                rutaImg = comun[i].Imagen.URL;
                                if (this.estilo && !(this.options.config.estiloViejo)){
                                    imagen = "<i class=\"material-icons\" style=\"color: #f19607\">" + rutaImg + "</i>";
                                } else {
                                    imagen = "<img src=" + '"' + rutaImg + '" ' + " width=" + '"' + comun[i].Imagen.Ancho + 'px"' + " height=" + '"' + comun[i].Imagen.Alto + 'px>"';
                                }                                
                                contenido = contenido + imagen + " <br> ";
                            } else {
                                if (comun[i].Enlace) {
                                    for (j = 0; j < comun[i].Enlace.length; j = j + 1) {
                                        link = "<a href=" + '"' + comun[i].Enlace[j].URL + '" ' + " target=" + '"' + "_blank" + '"' + ">" + comun[i].Enlace[j].Contenido + "</a>";
                                        contenido = contenido + link;
                                    }
                                } else {
                                    if (comun[i].Video) {
                                        link = "<video src=" + '"' + comun[i].Video.URL + '" ' + "width=\"360\" height=\"300\"" + " controls></video><br>";
                                        contenido = contenido + link + " <br> ";
                                    }
                                    else{
                                        if (comun[i].TextoSinEnter) {
                                            contenido = contenido + "<label>"+ comun[i].TextoSinEnter[0].Contenido + " </label>";
                                        }else{
                                            if (comun[i].DescargarPDF) {
                                                link = "<a href=" + '"' + comun[i].DescargarPDF[0].URL + '" ' + " target=" + '"' + "_blank" + '"' + "download=\"DatosForestal2011.pdf\"" + ">" + comun[i].DescargarPDF[0].Contenido + "</a>";
                                                contenido = contenido + link;
                                            }
                                            else{
                                                if (comun[i].DescargarEXCEL) {
                                                    link = "<a href=" + '"' + comun[i].DescargarEXCEL[0].URL + '" ' + " target=" + '"' + "_blank" + '"' + "download=\"DatosForestal2011.xls\"" + ">" + comun[i].DescargarEXCEL[0].Contenido + "</a>";
                                                    contenido = contenido + link;
                                                }
                                                else{
                                                    if (comun[i].TextoNegrita) {
                                                        for (j = 0; j < comun[i].TextoNegrita.length; j = j + 1) {
                                                            contenido = contenido + "<b><p class=" + '"' + comun[i].TextoNegrita[j].Estilo + '"' + ">" + comun[i].TextoNegrita[j].Contenido + "</p></b>";
                                                        }
                                                    } else{
                                                        if (comun[i].Imagenes) {
                                                            rutaImg = comun[i].Imagenes.URL;
                                                            imagen = "<img src=" + '"' + rutaImg + '" ' + " width=" + '"' + comun[i].Imagenes.Ancho + 'px"' + " height=" + '"' + comun[i].Imagenes.Alto + 'px>"';
                                                            contenido = contenido + imagen + " <br> ";
                                                        }                                                       
                                                    } 
                                                    
                                                }
                                            }
                                        }
                                        
                                    }
                                }
                            }
                        }
                    }
                    if (this._tree.get("selectedItems")[0].seccionContenido.titulo.Imagen) {
                        rutaImg = this._tree.get("selectedItems")[0].seccionContenido.titulo.Imagen.URL;
                        if (this.estilo){
                            imagen = "<i class=\"material-icons\" style=\"color: #f19607\">" + rutaImg + "</i>";
                            contenido = contenido + "<br>";
                            div2.innerHTML = imagen + titulo + contenido;
                        } else {
                            imagen = "<img src=" + '"' + rutaImg + '" ' + " width=" + '"' + "30px" + '"' + " height=" + '"' + "30px" + '" ' + titulo + " ";
                            contenido = contenido + "<br>  <br>";
                            div2.innerHTML = imagen + contenido;
                        }                        
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



