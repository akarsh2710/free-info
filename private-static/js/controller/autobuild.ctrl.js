'use strict';
app.controller('autobuildController', function($scope,$rootScope, $state, mainSvc,svcFaye,$uibModal,$anchorScroll,$location) {
	$scope.consoleLog = ""
	$scope.projects = []
    $scope.selectedProject;
	$scope.isBuildBtnDisabled = false;
	$scope.builddumpid = '';
	$scope.clogs = '';
	$scope.boolBldSuccess = false;
    var chanelName = "/"+$rootScope.uinkey;
	svcFaye.subscribe(chanelName, function(message){
			var stramData = "";
			var str = ""+message.msg.data;
			if(message.msg.mode === "completed"){
				$scope.builddumpid = message.msg.data.builddumpid;
				$scope.boolBldSuccess = true;
				return;
			}else if(message.msg.mode === "fail"){
				$scope.builddumpid = null;
				return;
			}
		    if(message.msg.mode === 'stderr'){
				if(str.trim() !== ""){
					stramData =  message.msg.mode+"##"+message.msg.error+" | "+str;
					if(message.msg.error){
							$scope.clogs = "<div class='console-error'>"+str+"</div>";
					}else{
							$scope.clogs = "<div>"+str+"</div>";
					}
					
					$scope.consoleLog =  $scope.consoleLog + stramData;
				}
			}else{
				if(str.trim() !== ""){
					stramData =  message.msg.mode+">"+message.msg.error+" | "+str;
					if(message.msg.error){
							$scope.clogs = "<div class='console-error'>"+str+"</div>";
					}else{
							$scope.clogs = "<div>"+str+"</div>";
					}
					$scope.consoleLog =  $scope.consoleLog + stramData;
					
				}
			}
			$location.hash('scrollbottom')
			$anchorScroll();
			
	});
	
	$scope.pushData = function (){
		svcFaye.publish(chanelName, {msg: "hello"})
	}
	
	$scope.doAutoBuild = function () {
		$scope.consoleLog = ""
		$scope.resetConsole();
		var data = {"projectname":$scope.selectedProject.projectname};
		mainSvc.postCommon("/buildapp/gateway/buildProjectAndDeploy",data).then(
            function (response) {},
            function (err) {
                console.log("Error >>>", err); 
            }
        );
	        
    };
  	
	function getProjectList(){
		 mainSvc.getCommon("/buildapp/gateway/listOfProjects",{}).then(
            function (response) {
            	 $scope.projects = response.data;
				 $scope.selectedProject = $scope.projects[0];
            },
            function (err) {
                console.log("Error >>>", err); 
            }
        );
	}
	
	
	$scope.onProjectSelect = function(project){
		$scope.builddumpid = "";
		$scope.consoleLog = '';
		$scope.boolBldSuccess = false;
		$scope.resetConsole();
	}
	
	if($state.current.name == "autobuild"){
		getProjectList();
	}
	
	$scope.editBuildInfo = function(user){
		if($scope.builddumpid === null || $scope.builddumpid === '' || $scope.builddumpid===undefined) return;
		var size = "lg";
		 var modalInstance = $uibModal.open({
		  animation: $scope.animationsEnabled,
		  templateUrl: 'buildinfopopup.html',
		  controller: 'ModalBuildInfoInstanceCtrl',
		  size: size,
		  resolve: {
			builddumpid: function () {
			  return $scope.builddumpid;
			}
		  }
		});
	};
	
	
});


app.controller('ModalBuildInfoInstanceCtrl', function ($scope, $uibModalInstance, builddumpid, mainSvc, $state) {
  $scope.errorList = [];
  $scope.buildForm = {
	  'name' : '',
	  'description' : '',
	  'appversion' : '',
	  'buildversion' : '',
	  'builddumpid' : builddumpid
  };
  
  $scope.save = function () {
	if(!doCrtFrmValiation()){
		return;
	}
	 var data = $scope.buildForm;
	 mainSvc.postCommon("/buildapp/gateway/saveAutoBuildDetails",data).then(
		function (response) {
			if(!response.error){
				$uibModalInstance.close();
				$state.go("home",{"projectid":response.data._id});
			}else{
				// error
				$scope.errorList.push({error:"",msg:response.errorType});
			}
			 
		},
		function (err) {
			console.log("Error >>>", err); 
		}
	);
  };
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
  
 function doCrtFrmValiation(){
		$scope.errorList = [];
		if($scope.buildForm.name.trim() === "" 
			|| $scope.buildForm.description.trim() === "" 
			|| $scope.buildForm.appversion.trim() === ""
			|| $scope.buildForm.buildversion.trim() === ""){
				$scope.errorList.push({error:"",msg:"Field Should not be empty."});
				return false;
		}
    	return true;
	}
	
  
});

app.directive("consoleLogger", function($compile){
    return{
        link: function(scope, element, attrs){
            //var template = "<button ng-click='doSomething()'>{{clogs}}</button>";
			scope.$watch('clogs', function(newValue) {
               // console.log(scope.clogs, "#############", newValue);
				var template = scope.clogs;
				//var linkFn = $compile(template);
				//var content = linkFn(scope);
				//console.log(template);
				element.append(template);
            });
			
			scope.resetConsole = function() {
				element.empty();
			}
			
        }
    }
});
