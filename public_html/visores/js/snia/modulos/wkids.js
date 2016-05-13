/*
 * js/snia/modulos/wkids
 * 
 */
/*global define*/
define(function () {
    return {
        UTM : 32721,
        GEO : 4326,
        WM : 102100,
        wkidOk : function (/*Number*/wkid) {
            return wkid === this.GEO || wkid === this.UTM || wkid === this.WM;
        }
    };
});