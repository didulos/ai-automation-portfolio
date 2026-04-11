Docker

# Docker

## 정의

Docker는 애플리케이션을 [[Container]](컨테이너)라는 표준화된 단위로 패킹하여 어느 환경에서나 동일하게 실행할 수 있게 하는 컨테이너화(containerization) 플랫폼이다. [[Image]](이미지)라 불리는 불변의 템플릿으로부터 컨테이너를 생성하며, 이를 통해 개발 환경과 프로덕션 환경 간의 불일치 문제를 해결한다.

## 왜 중요한가

현대 소프트웨어 개발에서 재현 가능하고 확장 가능한 배포(deployment) 방식의 사실상 표준으로, [[AI/ML]] 프로젝트의 모델 서빙(model serving)부터 마이크로서비스(microservices) 아키텍처까지 광범위하게 사용된다. DevOps 효율성 증대와 클라우드 네이티브 애플리케이션 개발의 필수 기술이다.

## 관련 개념

- **상위 개념**: [[Virtualization]](가상화)
- **하위 개념**: 
  - [[Container]](컨테이너): Docker 기반 실행 단위
  - [[Image]](이미지): 컨테이너 생성용 불변 템플릿
- **연관 개념**: 
  - [[Kubernetes]](쿠버네티스): Docker 컨테이너 오케스트레이션
  - [[Docker-Compose]](도커 컴포즈): 다중 컨테이너 정의 및 실행
  - [[Registry]](레지스트리): 도커 이미지 저장소 (Docker Hub, ECR 등)

## 비유로 이해하기

Docker는 레고 블록과 같다. 각 이미지는 조립 설명서가 담긴 레고 박스이고, 컨테이너는 그 박스에서 조립한 완성된 레고 작품이다. 어디서나 같은 방식으로 조립하면 동일한 결과물을 얻을 수 있다.

## 실제 사용 예시

```bash
# 머신러닝 모델 서빙을 위한 Docker 이미지 빌드
docker build -t ml-inference:latest .

# 학습된 모델을 포함한 컨테이너 실행
docker run -p 8000:8000 ml-inference:latest
```