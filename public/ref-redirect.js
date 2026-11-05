// Link tanpa '#' (Kreacy memotong hash): /ref/<id> -> /#/ref/<id>
var m = location.pathname.match(/^\/ref(\/[\w-]+)?\/?$/)
location.replace('/#/ref' + (m && m[1] ? m[1] : ''))
