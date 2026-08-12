const userRepository = require('../../repositories/user/user.repository');
const CustomExceptions = require('../../middleware/CustomExceptions')
const responseBuilder = require('../../utils/response.builder')


async function deposite(userId,amount){

    if (!amount || amount <= 0) {
        throw new CustomExceptions('Invalid amount',400)
        
    }

    const user = await userRepository.findById(userId)
    if (!user) {
        throw new CustomExceptions("User not found please refresh pages",404)
        
    }
    
    const currentBalance = parseFloat(user.balance);
    const depositAmount = parseFloat(amount);
    const newBalance = currentBalance + depositAmount;


    const updatedUser = await userRepository.deposite(userId,newBalance)
    if (!updatedUser) {
    throw new CustomExceptions('Failed to deposite balance', 500);
  }

  return responseBuilder.success({
    status: 200,
    message: "Successfully withdrew amount",
    data: {
      user: {
        id: updatedUser.id,        
        phone_number: updatedUser.phone_number, 
        role: updatedUser.role,      
        status: updatedUser.status,   
        balance: updatedUser.balance, 
        created_at: updatedUser.createdAt 
      }
    }
  });
}



async function withdraw (userId,amount){

    if (!amount || amount <= 0) {
        throw new CustomExceptions('Invalid amount',400)
        
    }

    const user = await userRepository.findById(userId)
    if (!user) {
        throw new CustomExceptions("User not found please refresh pages",404)
    }
    const currentBalance = parseFloat(user.balance);
    const withdrawAmount = parseFloat(amount);
    if (currentBalance < withdrawAmount) {
        throw new CustomExceptions('Insufficient balance', 400)
    }
    const newBalance = currentBalance - withdrawAmount;


    const updatedUser = await userRepository.withdraw(userId,newBalance)
    if (!updatedUser) {
    throw new CustomExceptions('Failed to withdraw balance', 500);
  }
  return responseBuilder.success({
    status: 200,
    message: "Successfully withdrew amount",
    data: {
      user: {
        id: updatedUser.id,        
        phone_number: updatedUser.phone_number, 
        role: updatedUser.role,      
        status: updatedUser.status,   
        balance: updatedUser.balance, 
        created_at: updatedUser.createdAt 
      }
    }
  });
}

module.exports = {
  deposite,
  withdraw
};