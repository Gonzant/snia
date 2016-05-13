/*
 * js/snia/modulos/CapaGrafica3SR
 * 
 */
/*global define*/
/*jslint nomen: true*/
define(["dojo/on",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "esri/layers/GraphicsLayer",
    "modulos/Grafico3SR"
    ], function (on, declare, lang, arrayUtil,
    GraphicsLayer,
    Grafico3SR) {
    "use strict";
    return declare(null, {
        //privado
        _gl: null,//GraphicsLayer
        _gs: null,//graficos (Grafico3SR)
        _mapa: null,//Mapa
        _mapaReloadListener: null,        
        //publico
        constructor: function () {
            this._gl = new GraphicsLayer();
            this._gs = [];
        },
        //auxiliares
        _init: function () {
            this._redibujar();
            this._mapaReloadListener = on(this._mapa, "reload", lang.hitch(this,this._mapaReload));
            this._mapa.map.addLayer(this._gl);
        },
        _redibujar: function () {
            this._gl.clear();
            var item;
            for(item in this._gs) {
                if (this._gs.hasOwnProperty(item))
                this._gl.add(this._gs[item].grafico(this._mapa.map.spatialReference.wkid));
            };
        },
        _mapaReload: function () {
            if (this._mapa) {
                if (this._mapa.map) {
                    this._mapa.map.removeLayer(this._gl);
                }
                this._redibujar();
                this._mapa.map.addLayer(this._gl);
            }
        },
        //mapa
        /*Map*/
        agregarMapa: function (mapa) {
            if (this._mapa) {
                this.removerMapa();
            }
            this._mapa = mapa;
            if (this._mapa.loaded) {
                this._init();
            } else {
                on.once(this._mapa, "load", this._init);
            }
        },
        removerMapa: function () {
            if (this._mapa) {
                this._mapa.map.removeLayer(this._gl);
                if (this._mapaReloadListener) {
                    this._mapaReloadListener.remove();
                }
                this._mapa = null;
            }
        },
        limpiar: function () {
            this._gl.clear();
            this._gs = [];
        },
        //graficos
        /*String*//*Graphic*/
        agregarGrafico: function (gid, g) {
            if (!this._gs.hasOwnProperty(gid)) {
                this._gs[gid] = new Grafico3SR(g);
                this._gl.add(this._gs[gid].grafico(this._mapa.map.spatialReference.wkid));
            }
        },
        /*String*/
        removerGrafico: function (gid) {
            if (this._gs.hasOwnProperty(gid)) {
                if (this._gl !== null) {
                    this._gl.remove(this._gs[gid].grafico(this._mapa.map.spatialReference.wkid));
                }
                delete this._gs[gid];
            }
        },
        //seleccion
        seleccionarGrafico: function (gid) {
            if (this._gs.hasOwnProperty(gid)) {
                this._gs[gid].selectGraphic();
            }
        },
        deseleccionarGrafico: function (gid) {
            if (this._gs.hasOwnProperty(gid)) {
                this._gs[gid].unSelectGraphic();
            }
        },
        getGrafico: function (gid) {
            if (this._gs.hasOwnProperty(gid)) {
                return this._gs[gid];
            }
        },
        seleccionarGraficoClickeado: function () { return; }
    });
});
