build :
	mkdir -p app
	mkdir -p srv
	cp -r ../../../store/store.js app
	cp -r ../../../store/srv/*.js app/srv
	docker build -t msr-store:1 .
	docker build -t msr-store-prod:1 -f Dockerfile-prod .

clean :
	rm *~

.PHONY : build clean
