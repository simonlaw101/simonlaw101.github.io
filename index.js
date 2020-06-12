var firebaseConfig = {
	apiKey: "AIzaSyBkdxLiZgY5Cm2GyhueaTsfMBQFKy_X8eI",
	authDomain: "black-magic-io.firebaseapp.com",
	databaseURL: "https://black-magic-io.firebaseio.com",
	projectId: "black-magic-io",
	storageBucket: "black-magic-io.appspot.com",
	messagingSenderId: "615735133556",
	appId: "1:615735133556:web:52e28a3da21436bf141821"
};
firebase.initializeApp(firebaseConfig);
db = firebase.firestore();

var answerSet = new Set();

function deleteData(col){
	db.collection(col).get().then(res => {
		res.forEach(element => {
			element.ref.delete();
		});
	});
}

function addData(col, data){
	db.collection(col).add(data)
	.then(function(docRef) {
		console.log("addData() Document ID: ", docRef.id);
	})
	.catch(function(error) {
		console.error("addData() Error adding document: ", error);
	});	
}

function addDataById(col, id, data){
	db.collection(col).doc(id).set(data)
	.then(function() {
		console.log("addDataById() Document ID: ", id);
	})
	.catch(function(error) {
		console.error("addDataById() Error adding document: ", error);
	});	
}

function listenData(){
	db.collection('answer')
	.orderBy("time")
    .onSnapshot(function(snapshot) {
        snapshot.docChanges().forEach(function(change) {
            if (change.type === "added") {
				var data = change.doc.data();
				//console.log(data);
				var tickClass = 'green';
				var crossClass = 'red';
				var tagClass = 'tag';
				if(data.status=='Correct'){
					tagClass += ' correct';
				}else if(data.status=='Wrong'){
					tagClass += ' wrong';
				}	
				if($("#player").val()!=$("#host").val()){
					tickClass += ' hidden';
					crossClass += ' hidden';
				}
				var template = `<div id='${data.time}' class='${tagClass}'><span>${data.answer} <sub class='guesser'>${data.name}</sub><sup id='tagTick' class='${tickClass}' onclick='isGreen(this, "${data.name}")'>&#10003;</sup> <sup id='tagCross' class='${crossClass}' onclick='isRed(this, "${data.name}")'>&#10005;</sup></span></div>`;
				$("#answerList").append(template);
				$('#answerList').scrollTop($('#answerList')[0].scrollHeight);
				answerSet.add(data.answer.toLowerCase());
            }
			if (change.type === "modified") {
				var data = change.doc.data();
				//console.log(data.status);
				if(data.status=='Correct'){
					$("#"+data.time).removeClass('wrong');
					$("#"+data.time).addClass('correct');
				}else{
					$("#"+data.time).removeClass('correct');
					$("#"+data.time).addClass('wrong');
				}
            }
			if (change.type === "removed") {
                $("#answerList").empty();
            }
        });
    });
	
	db.collection('chatroom')
	.orderBy("time")
    .onSnapshot(function(snapshot) {
        snapshot.docChanges().forEach(function(change) {
            if (change.type === "added") {
				var data = change.doc.data();
				//console.log(data);
				var msgClass = 'msgln';
				if(data.name=='MagicBot'){
					msgClass += ' botMsg';
				}
				$("#chatbox").append(`<div class='${msgClass}'>${data.timeStr}<b> ${data.name}</b>: ${data.msg}<br></div>`);
				$('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
            }
			if (change.type === "removed") {
                $("#chatbox").empty();
            }
        });
    });
	
	db.collection('gameinfo')
    .onSnapshot(function(snapshot) {
        snapshot.docChanges().forEach(function(change) {
            if (change.doc.id =="host" && (change.type === "modified" || change.type === "added")) {
				var data = change.doc.data();
				$("#host").val(data.name);
				checkIfHost();
            }
			if (['winner1','winner2','winner3'].includes(change.doc.id) && (change.type === "modified" || change.type === "added")) {
				var data = change.doc.data();
				$("#"+change.doc.id).text(data.name);
            }
        });
    });
	
	db.collection('players')
    .onSnapshot(function(snapshot) {
        snapshot.docChanges().forEach(function(change) {
            if (change.type === "modified") {
				var id = change.doc.id;
				var data = change.doc.data();
				//console.log(id);
				//console.log(data);
				if(data.guess==2){
					systemMsg(id+" got 2 answers correct!");
				}else if(data.guess>2){
					updateGuess(id, 0);
					updateWinner(id);
				}
            }
        });
    });
}

function formatDate(date) {
	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
	return monthNames[date.getMonth()] + ' ' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes();
}

function updateHost(){
	db.collection("gameinfo").doc("host").update({
		name: $("#player").val()
	})
	.then(function() {
		console.log("updateHost() Document successfully updated!");
		checkIfHost();
	})
	.catch(function(error) {
		console.error("updateHost() Error updating document: ", error);
	});
}

function updateAnswer(id, stat){
	db.collection("answer").doc(id).update({
		status: stat
	})
	.then(function() {
		console.log("updateAnswer() Document successfully updated!");
	})
	.catch(function(error) {
		console.error("updateAnswer() Error updating document: ", error);
	});
}

function resetGuess(){
	db.collection("players").get().then(function(querySnapshot) {
		querySnapshot.forEach(function(doc) {
			return db.collection("players").doc(doc.id).update({
				guess: 0
			});
		});
	});	
}

function updateGuess(name, count){
	var increment = firebase.firestore.FieldValue.increment(1);
	if(count==0){
		increment = 0;
	}
	db.collection("players").doc(name).update({
		guess: increment
	})
	.then(function() {
		console.log("updateGuess() Document successfully updated!");
	})
	.catch(function(error) {
		console.error("updateGuess() Error updating document: ", error);
	});
}

function updateWinner(name){
	db.collection("gameinfo").doc("winnerCount").get().then(function(doc) {
		if (doc.exists) {
			var data = doc.data();
			var count = data.count;
			systemMsg(name+" knows the Black Magic. Congrats!");
			if(count==0){
				setWinner("1", name);
			}else if(count==1){
				setWinner("2", name);
			}else if(count==2){
				setWinner("3", name);
			}else{
				systemMsg("The game is over. Please start another game.");
			}
			updateWinnerCount(1);
		} else {
			console.log("updateWinner() No such document!");
		}
	}).catch(function(error) {
		console.log("updateWinner() Error getting document:", error);
	});
}

function setWinner(rank, player){
	db.collection("gameinfo").doc("winner"+rank).update({
		name: player
	})
	.then(function() {
		console.log("setWinner() Document successfully updated!");
	})
	.catch(function(error) {
		console.error("setWinner() Error updating document: ", error);
	});
}

function updateWinnerCount(num){
	var increment = firebase.firestore.FieldValue.increment(1);
	if(num==0){
		increment = 0;
	}
	db.collection("gameinfo").doc("winnerCount").update({
		count: increment
	})
	.then(function() {
		console.log("updateWinnerCount() Document successfully updated!");
	})
	.catch(function(error) {
		console.error("updateWinnerCount() Error updating document: ", error);
	});
}

function checkIfHost(){
	if($("#player").val()==$("#host").val()){
		$("#clearChat").show();
		$("#tick").show();
		$("#cross").show();
		$("#answerBtn").hide();
		$("sup").show();
	}else{
		$("#clearChat").hide();
		$("#tick").hide();
		$("#cross").hide();
		$("#answerBtn").show();
		$("sup").hide();
	}
}

function isRed(ele, name){
	var div = $(ele).parent().parent();
	if(!div.hasClass("wrong")){
		div.removeClass('correct');
		div.addClass('wrong');
		updateAnswer(div.attr('id'), 'Wrong');
		updateGuess(name, 0);
	}
}

function isGreen(ele, name){
	var div = $(ele).parent().parent();
	if(!div.hasClass("correct")){
		div.removeClass('wrong');
		div.addClass('correct');
		updateAnswer(div.attr('id'), 'Correct');
		updateGuess(name, 1);		
	}
}

function systemMsg(s){
	var date = formatDate(new Date());
	var datetime = new Date().toISOString().replace(/T/, ' ').replace(/Z/, '');
	var data = {name: 'MagicBot',
				timeStr: date,
				time: datetime,
				msg: s};
	addData('chatroom', data);
}

$(document).ready(function(){
	listenData();
	$("#tick").click(function(){
		var playerAnswer = $("#answerBox").val().trim().replace(/ /g, '') ;
		if(playerAnswer!='' && !answerSet.has(playerAnswer.toLowerCase())){
			var datetime = new Date().toISOString().replace(/T/, '').replace(/Z/, '').replace(/-/g, '').replace(/:/g, '').replace(/\./g, '');
			var username = $("#player").val();				
			var data = {name: username,
						time: datetime,
						answer: playerAnswer,
						status: "Correct"};
			addDataById('answer', datetime, data);
		}
		$("#answerBox").val("");
		return false;
	});
	$("#cross").click(function(){
		var playerAnswer = $("#answerBox").val().trim().replace(/ /g, '');
		if(playerAnswer!='' && !answerSet.has(playerAnswer.toLowerCase())){
			var datetime = new Date().toISOString().replace(/T/, '').replace(/Z/, '').replace(/-/g, '').replace(/:/g, '').replace(/\./g, '');
			var username = $("#player").val();
			var data = {name: username,
						time: datetime,
						answer: playerAnswer,
						status: "Wrong"};
			addDataById('answer', datetime, data);
		}
		$("#answerBox").val("");
		return false;
	});
	$("#answerBtn").click(function(){
		var playerAnswer = $("#answerBox").val().trim().replace(/ /g, '');
		if(playerAnswer!='' && !answerSet.has(playerAnswer.toLowerCase())){
			var datetime = new Date().toISOString().replace(/T/, '').replace(/Z/, '').replace(/-/g, '').replace(/:/g, '').replace(/\./g, '');
			var username = $("#player").val();				
			var data = {name: username,
						time: datetime,
						answer: playerAnswer,
						status: "Pending"};
			addDataById('answer', datetime, data);
		}
		$("#answerBox").val("");
		return false;
	});
 	$("#msgBtn").click(function(){
		var clientmsg = $("#msgBox").val().trim();
		if(clientmsg!=''){
			var date = formatDate(new Date());
			var datetime = new Date().toISOString().replace(/T/, ' ').replace(/Z/, '');
			var username = $("#player").val();
			var data = {name: username,
						timeStr: date,
						time: datetime,
						msg: clientmsg};
			addData('chatroom', data);
		}
		$("#msgBox").val("");
		return false;
	});
	$("#clearAnswers").click(function(){
		$( "#dialog-confirm" ).dialog({
			resizable: false,
			height: "auto",
			width: 400,
			modal: true,
			buttons: {
				"Yes": function() {
					$("#answerList").empty();
					answerSet.clear();
					updateHost();
					deleteData('answer');
					setWinner("1","");
					setWinner("2","");
					setWinner("3","");
					updateWinnerCount(0);
					resetGuess();
					systemMsg($("#player").val()+' has started a new game!');
					$( this ).dialog( "close" );
				},
				"No": function() {
					$( this ).dialog( "close" );
				}
			}
		});
		return false;
	});
	$("#clearChat").click(function(){
		$("#chatbox").empty();
		deleteData('chatroom');
		return false;
	});
	$("#player").change(function() {
		checkIfHost();
	});
});