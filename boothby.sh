#!/bin/bash
 
function d_start ()
{ 
	echo "Boothby: starting service"
	BASEDIR=$(dirname "$0")
	cd "$BASEDIR" && npm start &
    sleep 5
}
 
function d_stop ()
{ 
	echo "Boothby: stopping service"
	ps -ef | grep node | grep -v grep | awk '{print $2}' | xargs kill -9
 }
 
function d_status ( )
{ 
	ps -ef | grep node | grep -v grep
}

case "$1" in
	start)
		d_start
		;;
	stop)
		d_stop
		;;
	reload)
		d_stop
		sleep 1
		d_start
		;;
	status)
		d_status
		;;
	* ) 
	echo "Usage: $0 {start | stop | reload | status}" 
	exit 1
	;;
esac
 
exit 0