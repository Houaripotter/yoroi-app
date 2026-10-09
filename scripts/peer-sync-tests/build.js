const path=require('path');
const map={'./database':'database.js','./multipeerBridge':'bridge.js','./security/logger':'logger.js','@react-native-async-storage/async-storage':'asyncstorage.js','react-native':'rn.js'};
require('esbuild').build({entryPoints:[require('path').join(__dirname,'../../lib/peerSyncService.ts')],bundle:true,platform:'node',format:'cjs',outfile:require('path').join(__dirname,'bundle.js'),
 plugins:[{name:'m',setup(b){b.onResolve({filter:/.*/},a=>map[a.path]?{path:path.join(__dirname,'mocks',map[a.path])}:undefined)}}]}).then(()=>console.log('built'));
