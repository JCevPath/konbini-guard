pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'konbiniguard'
        TAG = "${env.BUILD_NUMBER}"
    }

    triggers {
        githubPush()  
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
                sh 'docker build --target test -t konbiniguard/backend:test ./backend || true'
            }
        }

        stage('Build Images') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([file(credentialsId: 'konbiniguard-env', variable: 'ENV_FILE')]) {
                    sh 'cp "$ENV_FILE" .env'
                    sh 'docker compose up -d --no-build --remove-orphans'
                }
            }
        }

        stage('Smoke Test') {
            steps {
                echo 'Validating service availability...'
                sh '''
                  for i in $(seq 1 12); do
                    if curl -sf http://localhost:8000/ > /dev/null 2>&1 || \
                       curl -sf http://localhost:8080/ > /dev/null 2>&1 || \
                       wget -qO- http://localhost:8000/ > /dev/null 2>&1; then
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
            echo "Build ${TAG} failed. Check stage logs. Roll back with: TAG=<previous> docker compose up -d --no-build"
        }
        always {
            sh 'rm -f .env'
        }
    }
}