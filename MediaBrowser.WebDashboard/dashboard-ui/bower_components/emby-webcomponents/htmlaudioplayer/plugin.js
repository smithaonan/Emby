define(["events","browser","pluginManager","apphost","appSettings"],function(events,browser,pluginManager,appHost,appSettings){"use strict";function getSavedVolume(){return appSettings.get("volume")||1}function saveVolume(value){value&&appSettings.set("volume",value)}function getDefaultProfile(){return new Promise(function(resolve,reject){require(["browserdeviceprofile"],function(profileBuilder){resolve(profileBuilder({}))})})}function fade(elem,startingVolume){var newVolume=Math.max(0,startingVolume-.15);return console.log("fading volume to "+newVolume),elem.volume=newVolume,newVolume<=0?Promise.resolve():new Promise(function(resolve,reject){cancelFadeTimeout(),fadeTimeout=setTimeout(function(){fade(elem,newVolume).then(resolve,reject)},100)})}function cancelFadeTimeout(){var timeout=fadeTimeout;timeout&&(clearTimeout(timeout),fadeTimeout=null)}function HtmlAudioPlayer(){function playUwp(options,elem){return Windows.Storage.StorageFile.getFileFromPathAsync(options.url).then(function(file){var playlist=new Windows.Media.Playback.MediaPlaybackList,source1=Windows.Media.Core.MediaSource.createFromStorageFile(file),startTime=(options.playerStartPositionTicks||0)/1e4,winJsPlaybackItem=new Windows.Media.Playback.MediaPlaybackItem(source1,startTime);return playlist.items.append(winJsPlaybackItem),elem.src=URL.createObjectURL(playlist,{oneTimeOnly:!0}),self._currentSrc=elem.src,currentPlayOptions=options,playWithPromise(elem)})}function createMediaElement(){var elem=document.querySelector(".mediaPlayerAudio");return elem||(elem=document.createElement("audio"),elem.classList.add("mediaPlayerAudio"),elem.classList.add("hide"),document.body.appendChild(elem),elem.volume=getSavedVolume(),elem.addEventListener("timeupdate",onTimeUpdate),elem.addEventListener("ended",onEnded),elem.addEventListener("volumechange",onVolumeChange),elem.addEventListener("pause",onPause),elem.addEventListener("playing",onPlaying),elem.addEventListener("error",onError)),elem}function playWithPromise(elem){try{var promise=elem.play();return promise&&promise.then?promise.catch(function(e){var errorName=(e.name||"").toLowerCase();return"notallowederror"===errorName||"aborterror"===errorName?Promise.resolve():Promise.reject()}):Promise.resolve()}catch(err){return console.log("error calling audio.play: "+err),Promise.reject()}}function getCrossOriginValue(mediaSource){return mediaSource.IsRemote?null:"anonymous"}function supportsFade(){return!browser.tv}function onEnded(){var stopInfo={src:self._currentSrc};events.trigger(self,"stopped",[stopInfo]),self._currentTime=null,self._currentSrc=null,currentPlayOptions=null}function onTimeUpdate(){var time=this.currentTime;self._currentTime=time,events.trigger(self,"timeupdate")}function onVolumeChange(){fadeTimeout||(saveVolume(this.volume),events.trigger(self,"volumechange"))}function onPlaying(e){started?events.trigger(self,"unpause"):(started=!0,this.removeAttribute("controls"),seekOnPlaybackStart(e.target)),events.trigger(self,"playing")}function seekOnPlaybackStart(element){var seconds=(currentPlayOptions.playerStartPositionTicks||0)/1e7;if(seconds){var src=(self.currentSrc()||"").toLowerCase();if(!browser.chrome||src.indexOf(".m3u8")!==-1){var delay=browser.safari?2500:0;delay?setTimeout(function(){element.currentTime=seconds},delay):element.currentTime=seconds}}}function onPause(){events.trigger(self,"pause")}function onError(){var errorCode=this.error?this.error.code:"";errorCode=(errorCode||"").toString(),console.log("Media element error code: "+errorCode);var type;switch(errorCode){case 1:return;case 2:type="network";break;case 3:type="mediadecodeerror";break;case 4:type="medianotsupported";break;default:return}onErrorInternal(type)}function onErrorInternal(type){events.trigger(self,"error",[{type:type}])}function onDocumentClick(){document.removeEventListener("click",onDocumentClick);var elem=document.createElement("audio");elem.classList.add("mediaPlayerAudio"),elem.classList.add("hide"),document.body.appendChild(elem),elem.src=pluginManager.mapPath(self,"blank.mp3"),elem.play(),setTimeout(function(){elem.src="",elem.removeAttribute("src")},1e3)}var self=this;self.name="Html Audio Player",self.type="mediaplayer",self.id="htmlaudioplayer",self.priority=1;var currentPlayOptions,started;self.play=function(options){self._currentTime=null,started=!1;var elem=createMediaElement();self.mediaElement=elem;var val=options.url,seconds=(options.playerStartPositionTicks||0)/1e7;seconds&&(val+="#t="+seconds);var crossOrigin=getCrossOriginValue(options.mediaSource);if(crossOrigin&&(elem.crossOrigin=crossOrigin),elem.title=options.title,options.mimeType&&browser.operaTv)elem.currentSrc&&(elem.src="",elem.removeAttribute("src")),elem.innerHTML='<source src="'+val+'" type="'+options.mimeType+'">';else{if(window.Windows&&options.mediaSource&&options.mediaSource.IsLocal)return playUwp(options,elem);elem.src=val}return self._currentSrc=val,currentPlayOptions=options,playWithPromise(elem)},self.stop=function(destroyPlayer){cancelFadeTimeout();var elem=self.mediaElement,src=self._currentSrc;if(elem&&src){if(!destroyPlayer||!supportsFade())return elem.paused||elem.pause(),elem.src="",elem.innerHTML="",elem.removeAttribute("src"),onEnded(),Promise.resolve();var originalVolume=elem.volume;return fade(elem,elem.volume).then(function(){elem.paused||elem.pause(),elem.src="",elem.innerHTML="",elem.removeAttribute("src"),elem.volume=originalVolume,onEnded()})}return Promise.resolve()},appHost.supports("htmlaudioautoplay")||document.addEventListener("click",onDocumentClick)}function isValidDuration(duration){return!(!duration||isNaN(duration)||duration===Number.POSITIVE_INFINITY||duration===Number.NEGATIVE_INFINITY)}var fadeTimeout;return HtmlAudioPlayer.prototype.currentSrc=function(){return this._currentSrc},HtmlAudioPlayer.prototype.canPlayMediaType=function(mediaType){return"audio"===(mediaType||"").toLowerCase()},HtmlAudioPlayer.prototype.getDeviceProfile=function(item){return appHost.getDeviceProfile?appHost.getDeviceProfile(item):getDefaultProfile()},HtmlAudioPlayer.prototype.currentTime=function(val){var mediaElement=this.mediaElement;if(mediaElement){if(null!=val)return void(mediaElement.currentTime=val/1e3);var currentTime=this._currentTime;return currentTime?1e3*currentTime:1e3*(mediaElement.currentTime||0)}},HtmlAudioPlayer.prototype.duration=function(val){var mediaElement=this.mediaElement;if(mediaElement){var duration=mediaElement.duration;if(isValidDuration(duration))return 1e3*duration}return null},HtmlAudioPlayer.prototype.seekable=function(){var mediaElement=this.mediaElement;if(mediaElement){var seekable=mediaElement.seekable;if(seekable&&seekable.length){var start=seekable.start(0),end=seekable.end(0);return isValidDuration(start)||(start=0),isValidDuration(end)||(end=0),end-start>0}return!1}},HtmlAudioPlayer.prototype.pause=function(){var mediaElement=this.mediaElement;mediaElement&&mediaElement.pause()},HtmlAudioPlayer.prototype.resume=function(){var mediaElement=this.mediaElement;mediaElement&&mediaElement.play()},HtmlAudioPlayer.prototype.unpause=function(){var mediaElement=this.mediaElement;mediaElement&&mediaElement.play()},HtmlAudioPlayer.prototype.paused=function(){var mediaElement=this.mediaElement;return!!mediaElement&&mediaElement.paused},HtmlAudioPlayer.prototype.setVolume=function(val){var mediaElement=this.mediaElement;mediaElement&&(mediaElement.volume=val/100)},HtmlAudioPlayer.prototype.getVolume=function(){var mediaElement=this.mediaElement;if(mediaElement)return 100*mediaElement.volume},HtmlAudioPlayer.prototype.volumeUp=function(){this.setVolume(Math.min(this.getVolume()+2,100))},HtmlAudioPlayer.prototype.volumeDown=function(){this.setVolume(Math.max(this.getVolume()-2,0))},HtmlAudioPlayer.prototype.setMute=function(mute){var mediaElement=this.mediaElement;mediaElement&&(mediaElement.muted=mute)},HtmlAudioPlayer.prototype.isMuted=function(){var mediaElement=this.mediaElement;return!!mediaElement&&mediaElement.muted},HtmlAudioPlayer.prototype.destroy=function(){},HtmlAudioPlayer});