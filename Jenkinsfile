pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'konbiniguard'
        TAG = "${env.BUILD_NUMBER}"
    }

    triggers {
        pollSCM('* * * * *')
    }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {

                withCredentials([file(credentialsId: 'konbiniguard-env', variable: 'ENV_FILE')]) {
                sh 'cp $ENV_FILE .env'
                }
                sh 'docker compose -p konbiniguard down --remove-orphans'
                sh 'docker rm -f konbiniguard_db 2>/dev/null || true'
                sh 'docker compose --env-file .env -p konbiniguard up -d db'
                sh 'sleep 10'

                sh '''
                  docker compose --env-file .env -p konbiniguard exec -T db psql -U konbini_admin -d konbiniguard -tAc \
                  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'food_items');" | grep -q t || \
                  docker compose --env-file .env -p konbiniguard exec -T db psql -U konbini_admin -d konbiniguard < db/init.sql
                '''

                sh 'docker compose --env-file .env -p konbiniguard build --no-cache backend'
                sh 'docker compose --env-file .env -p konbiniguard run --rm -e DATABASE_URL=postgresql+psycopg2://konbini_admin:konbinipass@db:5432/konbiniguard backend python -m pytest'
                
                sh '''
                  docker compose --env-file .env -p konbiniguard exec -T db psql -U konbini_admin -d konbiniguard -tAc \
                  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'food_items');" | grep -q t || \
                  docker compose --env-file .env -p konbiniguard exec -T db psql -U konbini_admin -d konbiniguard < db/init.sql
                '''
            }
        }

        stage('Build Images') {
            steps {
                sh 'docker compose --env-file .env -p konbiniguard build'
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([file(credentialsId: 'konbiniguard-env', variable: 'ENV_FILE')]) {
                    sh 'cp "$ENV_FILE" .env'
                }
                sh 'docker compose --env-file .env -p konbiniguard down --remove-orphans'
                sh 'docker rm -f konbiniguard_db konbiniguard_backend konbiniguard_checker konbiniguard_frontend 2>/dev/null || true'
                sh 'docker compose --env-file .env -p konbiniguard up -d --no-build'
            }
        }

        stage('Smoke Test') {
            steps {
                echo 'Validating service availability...'
                sh '''
                  for i in $(seq 1 12); do
                    if docker run --rm --network konbiniguard_konbini_network curlimages/curl:latest curl -sf http://konbiniguard_backend:80/ > /dev/null 2>&1 || \
                       docker run --rm --network konbiniguard_konbini_network curlimages/curl:latest curl -sf http://konbiniguard_frontend:80/ > /dev/null 2>&1; then
                      echo "Smoke test passed"
                      exit 0
                    fi
                    echo "Waiting for KonbiniGuard services to start..."
                    sleep 5
                  done
                  echo "Smoke test failed."
                  exit 1
                '''
            }
        }
    }
    post {
        success {
            echo "KonbiniGuard build ${TAG} is live."
        }

        failure {
            echo "Build ${TAG} failed. Restoring previous stack state..."
            script {
                def prevBuild = currentBuild.previousSuccessfulBuild?.number ?: "latest"
                echo "Rolling back to last successful build: ${prevBuild}"
                
                withCredentials([file(credentialsId: 'konbiniguard-env', variable: 'ENV_FILE')]) {
                    sh 'cp "$ENV_FILE" .env'
                    sh "TAG=${prevBuild} docker compose --env-file .env -p konbiniguard up -d --no-build || true"
                }
            }
        }
        always {
            sh 'rm -f .env'
        }
    }
}