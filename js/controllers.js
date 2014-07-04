"use strict";
var squeezefox = angular.module('Squeezefox', []);
// ['ngRoute', 'phonecatControllers','phonecatFilters', 'phonecatServices'])
squeezefox.controller('WindowCtrl', ['$scope', function ($scope) {
    $scope.selectedPlayer = {playerid: "",
                             name: ""};
    localforage.getItem('selectedPlayer', function(cachedSelectedPlayer) {
        $scope.selectedPlayer = cachedSelectedPlayer || {playerid: "", name: ""};
    })
                                //{playerid: "00:04:20:2b:39:ec", name: ''}; //XXX make dynamic
    $scope.current_window = "play";
    $scope.hidden = false;
    $scope.server = { addr: '', port: '' }
    localforage.getItem('server', function (cachedServer) {
        $scope.server = cachedServer || ({ addr: '', port: '' });
    });
    $scope.playlist = {current: 0, list: []};
    $scope.active = false;
    $scope.power = 0;
    $scope.playing = false;
    $scope.shuffle = 0;
    
    $scope.JSONRPC = function JSONRPC(payload, callback) {
        var xhr = new XMLHttpRequest({mozSystem: true});
        xhr.open("POST", "http://"+$scope.server.addr+':'+$scope.server.port+"/jsonrpc.js");
        xhr.responseType = "json";
        xhr.send(JSON.stringify(payload));
        xhr.onload = function() {
            localforage.setItem("server", $scope.server);
            localforage.setItem("selectedPlayer", $scope.selectedPlayer);
            $scope.active = true;
            if (callback) { callback(this); }
        };
    };
    
    $scope.play = function play() { // toggle
        $scope.JSONRPC({"id":1,"method":"slim.request","params":[$scope.selectedPlayer.playerid, ["play", ""]]});
        //$scope.getStatus();
    };

    $scope.playPause = function playPause() { // toggle
        var newplaying = $scope.playing ? "1" : "0";
        $scope.playing = newplaying;
        $scope.JSONRPC({"id":1,"method":"slim.request","params":[$scope.selectedPlayer.playerid, ["pause", newplaying, "", ""]]});
        //$scope.getStatus();
    };
    $scope.backward = function backward() {
        $scope.JSONRPC({"id":1,"method":"slim.request","params":[$scope.selectedPlayer.playerid, ["button","jump_rew"]]});
        //$scope.getStatus();
    };
    $scope.forward = function forward() {
        $scope.JSONRPC({"id":1,"method":"slim.request","params":[$scope.selectedPlayer.playerid, ["button","jump_fwd"]]});
        //$scope.getStatus();
    };
    $scope.toggleShuffle = function toggleShuffle() {
        // 0 = disabled, 1 = per song, 2 = per album (unused)
        var newshuffle = $scope.shuffle == "0" ? "1" : "0";
        $scope.shuffle = newshuffle;
        $scope.JSONRPC({"id":1,"method":"slim.request","params": [$scope.selectedPlayer.playerid, ["playlist","shuffle", newshuffle]]});
    }


    $scope.powerToggle = function powerToggle() {
        var newpower = $scope.power ? "0" : "1";
        $scope.power = newpower;
        $scope.JSONRPC({"id":1,"method":"slim.request","params":[$scope.selectedPlayer.playerid, ["power", newpower]]});
        //$scope.getStatus();
    };
    $scope.powerOn = function powerOn() {
        $scope.JSONRPC({"id":1,"method":"slim.request","params":[$scope.selectedPlayer.playerid, ["power","1"]]});
        //$scope.getStatus();
    };
    $scope.volumeUp = function volup() {
        $scope.JSONRPC({"id":1,"method":"slim.request","params":[$scope.selectedPlayer.playerid, ["mixer","volume", "+2.5"]]});
    }
    $scope.volumeDown = function voldown() {
        $scope.JSONRPC({"id":1,"method":"slim.request","params":[$scope.selectedPlayer.playerid, ["mixer","volume", "-2.5"]]});
    }

    
    $scope.changeWindow = function changeWindow(name) {
        if (['play', 'music', 'favorites', 'settings'].indexOf(name) !== -1) {
            $scope.current_window = name;
        }
    }
    $scope.windowTitle = function(t) {
        function capitalize(s) {
            return s.substr(0,1).toUpperCase() + s.substr(1);
        }
        switch (t) {
            case "play":
                return "Now playing"
            break;
            default:
                return capitalize(t);
        }
    }

    // CSS functions XXX rewrite with ng-show
    $scope.CSS_Enabled = function() {
        $scope.active = true;
    };
    $scope.CSS_Playing = function() {
        return $scope.playing ? 'media-pause' : 'media-play';
    };
    $scope.CSS_Shuffle = function() {
        return $scope.shuffle ? 'media-shuffleon' : 'media-shuffleoff';
    };    

    $scope.CSS_Power = function() {
        return $scope.power ? "brightness" : "lower-brightness";

    } 

    $scope.CSS_window = function CSS_window(name) {
        var sb = document.getElementById("sidebar");
        var scope = angular.element(sb).scope();
        return (name == $scope.current_window) ? "" : "hiddenwindow"
    }


/*<div id="window-music"></div>
    <div id="window-favorites"></div>
    <div id="window-settings"></div>*/
    
}]);

squeezefox.controller('PlayerStatusCtrl', ['$scope', '$http', '$interval', function ($scope, $http, $interval) {
    // defaults
    var lastUpdate = 0;
    $scope.playerTitle = "";
    $scope.currentArtist = "";
    $scope.currentTitle = "";
    $scope.artworkURL = "img/cover-missing.png";
    $scope.showPlaylist = false;

    // Update Status
    $scope.getStatus = function getStatus() {
        //XXX replace 50 with max(50,playlistsize)
        if ($scope.$parent.hidden) {
             /* skips XHR when app is minimized, this is set
              * outside of angular with the page visibility api.
              * (see bottom of this file)
             */
            return;
            }
        $scope.JSONRPC({"id":1,"method":"slim.request","params":[$scope.selectedPlayer.playerid, ["status","-", 50, "tags:gABbehldiqtyrSuoKLNJ"]]}, function(xhr) {
            //xhr.response.result.mode (play, stop, pause)
            $scope.playerTitle = xhr.response.result.current_title;
            $scope.$parent.playing = (xhr.response.result.mode == "play");
            $scope.$parent.active = true;
            $scope.$parent.power = xhr.response.result.power;
            $scope.$parent.shuffle = xhr.response.result['playlist shuffle'];
            $scope.repeat = xhr.response.result['playlist repeat'];
            $scope.$parent.playlist.list = xhr.response.result.playlist_loop;
            $scope.$parent.playlist.current = xhr.response.result.playlist_cur_index;
            var currentlyPlaying;
            for (var entry of $scope.$parent.playlist.list) {
                if (entry['playlist index'] == $scope.$parent.playlist.current) {
                    var currentlyPlaying = entry;
                    $scope.currentArtist = currentlyPlaying.artist;
                    $scope.currentTitle = currentlyPlaying.title;
                }
            }
            if ('remoteMeta' in xhr.response.result) {
                var rm = xhr.response.result.remoteMeta; //$scope.playlist.list[$scope.playlist.current];
                $scope.artworkURL = rm.artwork_url || "img/icons/icon128x128.png";
            }
            lastUpdate = Date.now();
        });
    }
    $scope.refresher = undefined;
    if (typeof $scope.refresher == "undefined") {
        $scope.getStatus();
        $scope.refresher = $interval(function() { $scope.getStatus(); }, 5000);
    }

    $scope.transitionToggle = function transitionToggle() {
        $scope.showPlaylist = $scope.showPlaylist ? false : true;
    }
    $scope.CSS_transition = function CSS_transition() {
        return $scope.showPlaylist ? "performtransition" : "";
    }

    // 
    $scope.playItem = function playItem(index) {
        //XXX update playlists and display?
        $scope.JSONRPC({"id":1,"method":"slim.request","params": [$scope.selectedPlayer.playerid, ["playlist","index",index,""]]});
            
    }
    $scope.prettyDuration = function prettyDuration(total) {
        function pad(d) {
            if (d < 10) { return '0'+d }
            return d
        }
        if (total == 0) { return; }
            var m = parseInt(total%3600 / 60)
            var s = total % 60        
        if (total < 3600) {
            return "("+m+":"+pad(s)+")";
        }
        else {
            var h = parseInt(total / 3600);
            return "("+h+":"+pad(m)+":"+pad(s)+")";
        }
    }
}]);
squeezefox.controller('MusicSearchCtrl', ['$scope', function ($scope) {
    $scope.searchterm = "";
    $scope.searchresults = []
    $scope.searchdetails = {};
    $scope.showTrackDialog = false;
    $scope.dialogItem = {};
    $scope.search = function search(term) {
        $scope.JSONRPC({"id":1,"method":"slim.request","params":["",["search", "0","20","term:"+term]]}, function(xhr) {
            var tracks = []
            if ('tracks_loop' in xhr.response.result) {
                tracks = xhr.response.result.tracks_loop; // array with objects that have track_id, track properties
            }
            $scope.searchresults = tracks;
            // fill in details for list (e.g. artist)
            for (var item of tracks) {
                $scope.JSONRPC({"id":1,"method":"slim.request","params":["",["songinfo", "0","11","track_id:"+item.track_id]]}, function(xhr) {
                    var songinfo = xhr.response.result.songinfo_loop;
                    $scope.searchdetails[parseInt(songinfo[0].id)] = {
                        title: songinfo[1].title, artist: songinfo[2].artist,
                        coverid: songinfo[3].coverid, duration: songinfo[4].duration,
                        album_id: songinfo[5].album_id,
                        album: songinfo[5].album,
                        coverurl: "http://"+$scope.server.addr+':'+$scope.server.port+"/music/"+songinfo[3].coverid+"/cover_150x150_o" };
                });
            }
        });
    }
    $scope.trackDialog = function trackDialog(item) {
        $scope.dialogItem = item;
        $scope.showTrackDialog = true;
    }
    $scope.addItem = function addItem(item) { // add to queue
        $scope.showTrackDialog=false;
        $scope.JSONRPC({"id":1,"method":"slim.request","params":["00:04:20:2b:39:ec",["playlist","addtracks","track.titlesearch="+item.track]]})
    }
    $scope.playItem = function playItem(item) { // play now
        $scope.showTrackDialog=false;
        $scope.JSONRPC({"id":1,"method":"slim.request","params":["00:04:20:2b:39:ec",["playlist","loadtracks","track.titlesearch="+item.track]]})

    }
}]);
squeezefox.controller('FavoritesCtrl', ['$scope', function ($scope) {
    $scope.favorites = []
    localforage.getItem("favorites", function (cachedFavorites) {
        $scope.favorites = cachedFavorites || [];
    });
    var triedfavorites = false;
    if (triedfavorites == false) {
        if ($scope.selectedPlayer.playerid !== "") {
            triedfavorites = true;
            $scope.JSONRPC({"id":1,"method":"slim.request","params": [$scope.selectedPlayer.playerid, ["favorites","items","","9999"]]}, function(xhr) {
                $scope.favorites = xhr.response.result.loop_loop;
                localforage.setItem("favorites", xhr.response.result.loop_loop);
            });
        }
    }
    $scope.playFavorite = function playFavorite(id) {
        $scope.JSONRPC({"id":1,"method":"slim.request","params": [$scope.selectedPlayer.playerid, ["favorites","playlist","play","item_id:"+id]]}); 
    }

    $scope.playDeezer = function() {
        var x = new XMLHttpRequest();
        x.open("GET",
        "http://192.168.235.2:9000/plugins/deezer/index.html?action=playall&index=4cd7c293.3.0.1&player=00%3A04%3A20%3A2b%3A39%3Aec&sess=&start=&_dc=1403809424200"
        );
        x.send();

    }
}]);

squeezefox.controller('SettingsCtrl', ['$scope', function ($scope) {
    $scope.players = [];
    localforage.getItem("players", function (cachedPlayers) {
        $scope.players = cachedPlayers || [];
    });
    /*     {
            "model" : "baby",
            "connected" : 1,
            "displaytype" : "none",
            "seq_no" : "297",
            "ip" : "192.168.235.180:54444",
            "power" : 0,
            "uuid" : "3e08aeb1e28940bfc8e73028939025f8",
            "name" : "Küchenradio",
            "isplayer" : 1,
            "canpoweroff" : 1,
            "playerid" : "00:04:20:2b:39:ec"
         }, */



    $scope.tryServer = function tryServer() {
        $scope.JSONRPC({"id":1,"method":"slim.request","params":["",["serverstatus",0,999]]}, function(xhr) {
            $scope.$parent.active = true; // errback and feedback.            
            $scope.players = xhr.response.result.players_loop;
            localforage.setItem("players", xhr.response.result.players_loop);
        });
    }
}]);

/*
angular.element(document).ready(function() {
    document.addEventListener("visibilitychange", function() {
        // used to limit getStatus XHR
        angular.element(document.body).scope().hidden = document.hidden;
    }, false);
    
    // fire a first getStatus asap:
    angular.element(document.querySelector("#window-play")).scope().getStatus
});
*/
