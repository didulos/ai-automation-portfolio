epoch

# epoch

## 정의
한 번의 [[Training]](훈련) 과정에서 전체 [[Dataset]](데이터셋)을 모델이 정확히 한 번 보는 것을 의미한다. 즉, 훈련 데이터의 모든 샘플이 [[Backpropagation]](역전파)을 통해 가중치(weight) 업데이트에 사용되는 완전한 사이클이다.

## 왜 중요한가
모델의 수렴(convergence) 정도를 제어하는 핵심 하이퍼파라미터(hyperparameter)로, epoch 수가 너무 적으면 과소적합([[Underfitting]])이, 너무 많으면 과적합([[Overfitting]])이 발생하므로 정확히 조정해야 한다.

## 관련 개념
- **상위 개념**: [[Training]](훈련)
- **하위 개념**: 
  - [[Batch]](배치): 한 epoch 내에서 가중치 한 번 업데이트에 사용되는 샘플 그룹
  - [[Iteration]](이터레이션): 한 배치로 한 번의 가중치 업데이트를 수행하는 단위
- **연관 개념**: 
  - [[Learning-Rate]](학습률): epoch마다 조정될 수 있는 하이퍼파라미터
  - [[Validation]](검증): 매 epoch 후 모델 성능을 평가하는 과정

## 비유로 이해하기
학생이 한 학기(epoch) 동안 교과서의 모든 장(chapter)을 정확히 한 번씩 읽는 것과 같다. 여러 학기를 거치면서 학생의 실력이 점진적으로 향상되는 것처럼, 여러 epoch을 거치면서 모델의 성능이 개선된다.

## 실제 사용 예시
```python
# 100 epoch 동안 모델 훈련
model.fit(train_data, train_labels, epochs=100, batch_size=32)

# Early stopping으로 최적 epoch 찾기
history = model.fit(X_train, y_train, epochs=200, 
                    validation_data=(X_val, y_val),
                    callbacks=[EarlyStopping(monitor='val_loss', patience=10)])
```